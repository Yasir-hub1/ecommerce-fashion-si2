import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RbacApi } from '../api/rbac.api';
import { ADMIN_NAV, type AdminNavItem } from '../config/admin-nav.config';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly rbacApi = inject(RbacApi);

  private readonly _codes = signal<string[]>([]);
  private readonly _role = signal('');
  private readonly _roleName = signal('');

  readonly codes = this._codes.asReadonly();
  readonly role = this._role.asReadonly();
  readonly roleName = this._roleName.asReadonly();

  readonly isStaff = computed(() => this._role() !== '' && this._role() !== 'CUSTOMER');

  readonly visibleAdminNav = computed(() =>
    ADMIN_NAV.filter((item) => this.canAccessNavItem(item)),
  );

  setFromLogin(role: string, permissions: string[] = []): void {
    this._role.set(role);
    this._codes.set(permissions);
  }

  async loadFromApi(): Promise<void> {
    try {
      const data = await firstValueFrom(this.rbacApi.getMyPermissions());
      this._role.set(data.role);
      this._roleName.set(data.role_name);
      this._codes.set(data.permission_codes);
    } catch {
      // keep login snapshot
    }
  }

  clear(): void {
    this._codes.set([]);
    this._role.set('');
    this._roleName.set('');
  }

  has(code: string): boolean {
    return this._codes().includes(code);
  }

  hasAny(...codes: string[]): boolean {
    if (codes.length === 0) return true;
    const set = this._codes();
    return codes.some((c) => set.includes(c));
  }

  hasAll(...codes: string[]): boolean {
    const set = this._codes();
    return codes.every((c) => set.includes(c));
  }

  canAccessNavItem(item: AdminNavItem): boolean {
    if (!item.permissions?.length) return true;
    return this.hasAny(...item.permissions);
  }
}

export function getPostLoginPath(role: string): string {
  return role === 'CUSTOMER' ? '/ecommerce' : '/admin';
}
