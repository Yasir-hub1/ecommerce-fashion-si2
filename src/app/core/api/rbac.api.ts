import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { PaginatedResponse } from '../models/api.models';
import type {
  AppPermission,
  PermissionWritePayload,
  RoleDefinition,
  RoleWritePayload,
  UserPermissionsPayload,
} from '../models/rbac.models';

@Injectable({ providedIn: 'root' })
export class RbacApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getMyPermissions(): Observable<UserPermissionsPayload> {
    return this.http.get<UserPermissionsPayload>(`${this.base}/auth/me/permissions/`);
  }

  listPermissions(params?: Record<string, string>): Observable<PaginatedResponse<AppPermission>> {
    return this.http.get<PaginatedResponse<AppPermission>>(`${this.base}/permissions/`, {
      params: new HttpParams({ fromObject: params ?? {} }),
    });
  }

  createPermission(body: PermissionWritePayload): Observable<AppPermission> {
    return this.http.post<AppPermission>(`${this.base}/permissions/`, body);
  }

  updatePermission(id: number, body: Partial<PermissionWritePayload>): Observable<AppPermission> {
    return this.http.patch<AppPermission>(`${this.base}/permissions/${id}/`, body);
  }

  deletePermission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/permissions/${id}/`);
  }

  listRoles(params?: Record<string, string>): Observable<PaginatedResponse<RoleDefinition>> {
    return this.http.get<PaginatedResponse<RoleDefinition>>(`${this.base}/roles/`, {
      params: new HttpParams({ fromObject: params ?? {} }),
    });
  }

  getRole(id: number): Observable<RoleDefinition> {
    return this.http.get<RoleDefinition>(`${this.base}/roles/${id}/`);
  }

  createRole(body: RoleWritePayload): Observable<RoleDefinition> {
    return this.http.post<RoleDefinition>(`${this.base}/roles/`, body);
  }

  updateRole(id: number, body: Partial<RoleWritePayload>): Observable<RoleDefinition> {
    return this.http.patch<RoleDefinition>(`${this.base}/roles/${id}/`, body);
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/roles/${id}/`);
  }

  replaceRolePermissions(id: number, permissionIds: number[]): Observable<RoleDefinition> {
    return this.http.put<RoleDefinition>(`${this.base}/roles/${id}/permissions/`, {
      permission_ids: permissionIds,
    });
  }
}
