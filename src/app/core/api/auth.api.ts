import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  AuthUser,
  LoginResponse,
  PaginatedResponse,
  UserProfile,
} from '../models/api.models';

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/login/`, { email, password });
  }

  refresh(refresh: string): Observable<{ access: string }> {
    return this.http.post<{ access: string }>(`${this.base}/auth/refresh/`, { refresh });
  }

  register(payload: RegisterPayload): Observable<{ message: string; user: AuthUser }> {
    return this.http.post<{ message: string; user: AuthUser }>(
      `${this.base}/auth/register/`,
      payload,
    );
  }

  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/users/me/`);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/users/change_password/`, {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPassword,
    });
  }

  updateProfile(userId: number, body: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.base}/users/${userId}/`, body);
  }

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/password-reset/`, { email });
  }

  confirmPasswordReset(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/password-reset/confirm/`, {
      token,
      password,
      password_confirm: password,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  listProducts(params: Record<string, string | number>): Observable<PaginatedResponse<import('../models/api.models').ProductListItem>> {
    return this.http.get<PaginatedResponse<import('../models/api.models').ProductListItem>>(
      `${this.base}/products/`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) },
    );
  }

  getProduct(id: number | string): Observable<import('../models/api.models').ProductDetail> {
    return this.http.get<import('../models/api.models').ProductDetail>(`${this.base}/products/${id}/`);
  }

  getAvailability(
    productId: number | string,
    branchId?: number,
  ): Observable<import('../models/api.models').ProductAvailability> {
    let params = new HttpParams();
    if (branchId) params = params.set('branch', branchId);
    return this.http.get<import('../models/api.models').ProductAvailability>(
      `${this.base}/products/${productId}/availability/`,
      { params },
    );
  }

  listCategories(): Observable<PaginatedResponse<import('../models/api.models').Category>> {
    return this.http.get<PaginatedResponse<import('../models/api.models').Category>>(
      `${this.base}/categories/`,
    );
  }

  listBrands(): Observable<PaginatedResponse<import('../models/api.models').Brand>> {
    return this.http.get<PaginatedResponse<import('../models/api.models').Brand>>(
      `${this.base}/brands/`,
    );
  }

  listSeasons(): Observable<PaginatedResponse<import('../models/admin.models').Season>> {
    return this.http.get<PaginatedResponse<import('../models/admin.models').Season>>(
      `${this.base}/seasons/`,
    );
  }

  listCollections(params?: Record<string, string | number>): Observable<PaginatedResponse<import('../models/admin.models').Collection>> {
    return this.http.get<PaginatedResponse<import('../models/admin.models').Collection>>(
      `${this.base}/collections/`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) },
    );
  }

  listColors(): Observable<PaginatedResponse<import('../models/admin.models').Color>> {
    return this.http.get<PaginatedResponse<import('../models/admin.models').Color>>(
      `${this.base}/colors/`,
    );
  }

  listSizes(params?: Record<string, string | number>): Observable<PaginatedResponse<import('../models/admin.models').Size>> {
    return this.http.get<PaginatedResponse<import('../models/admin.models').Size>>(
      `${this.base}/sizes/`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) },
    );
  }

  lookupVariantByBarcode(barcode: string): Observable<import('../models/admin.models').VariantDetail | null> {
    return this.http.get<import('../models/admin.models').VariantDetail>(
      `${this.base}/variants/lookup/`,
      { params: { barcode } },
    );
  }
}
