import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { jwtDecode } from 'jwt-decode';
import { firstValueFrom } from 'rxjs';

import type { AuthUser, UserProfile } from '../models/api.models';
import { AuthApi } from '../api/auth.api';
import { getPostLoginPath, PermissionService } from '../services/permission.service';

const ACCESS_KEY = 'fs_access';
const REFRESH_KEY = 'fs_refresh';
const USER_KEY = 'fs_user';

interface JwtPayload {
  exp: number;
  role?: string;
  branch_id?: number;
  permissions?: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApi);
  private readonly permissions = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _profile = signal<UserProfile | null>(null);
  private readonly _initializing = signal(true);

  readonly user = this._user.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly initializing = this._initializing.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isCustomer = computed(() => this._user()?.role === 'CUSTOMER');
  readonly isStaff = computed(() => !!this._user() && this._user()?.role !== 'CUSTOMER');

  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this._initializing.set(false);
      return;
    }

    const access = localStorage.getItem(ACCESS_KEY);
    const userRaw = localStorage.getItem(USER_KEY);

    if (access && userRaw) {
      try {
        const payload = jwtDecode<JwtPayload>(access);
        if (payload.exp * 1000 > Date.now()) {
          const user = JSON.parse(userRaw) as AuthUser;
          this._user.set(user);
          this.permissions.setFromLogin(user.role, user.permissions ?? []);
          await Promise.all([this.loadProfile(), this.permissions.loadFromApi()]);
        } else {
          await this.tryRefresh();
        }
      } catch {
        this.clearSession();
      }
    }

    this._initializing.set(false);
  }

  getAccessToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(REFRESH_KEY);
  }

  async login(email: string, password: string): Promise<string> {
    const res = await firstValueFrom(this.authApi.login(email, password));
    this.persistSession(res.access, res.refresh, res.user);
    this.permissions.setFromLogin(res.user.role, res.user.permissions ?? []);
    await Promise.all([this.loadProfile(), this.permissions.loadFromApi()]);
    return getPostLoginPath(res.user.role);
  }

  async register(payload: Parameters<AuthApi['register']>[0]): Promise<void> {
    await firstValueFrom(this.authApi.register(payload));
    await this.login(payload.email, payload.password);
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/auth/login']);
  }

  async refreshAccessToken(): Promise<string | null> {
    return this.tryRefresh();
  }

  homePath(): string {
    return getPostLoginPath(this._user()?.role ?? 'CUSTOMER');
  }

  private async loadProfile(): Promise<void> {
    try {
      const profile = await firstValueFrom(this.authApi.me());
      this._profile.set(profile);
    } catch {
      // optional
    }
  }

  private persistSession(access: string, refresh: string, user: AuthUser): void {
    this._user.set(user);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  private async tryRefresh(): Promise<string | null> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      this.clearSession();
      return null;
    }

    try {
      const res = await firstValueFrom(this.authApi.refresh(refresh));
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(ACCESS_KEY, res.access);
      }
      await this.permissions.loadFromApi();
      return res.access;
    } catch {
      this.clearSession();
      return null;
    }
  }

  private clearSession(): void {
    this._user.set(null);
    this._profile.set(null);
    this.permissions.clear();
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
}
