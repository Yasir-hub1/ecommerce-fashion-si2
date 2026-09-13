import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';
import type { PaginatedResponse } from '../models/api.models';

export interface BitacoraEntry {
  readonly id: number;
  readonly user: number | null;
  readonly user_email: string;
  readonly user_full_name: string;
  readonly action: string;
  readonly action_display: string;
  readonly module: string;
  readonly resource: string;
  readonly object_id: string;
  readonly description: string;
  readonly method: string;
  readonly path: string;
  readonly ip_address: string | null;
  readonly metadata: Record<string, unknown>;
  readonly created_at: string;
}

export interface BitacoraQuery {
  readonly page?: number;
  readonly page_size?: number;
  readonly search?: string;
  readonly action?: string;
  readonly module?: string;
  readonly user?: number;
  readonly created_from?: string;
  readonly created_to?: string;
  readonly ordering?: string;
}

@Injectable({ providedIn: 'root' })
export class BitacoraApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/bitacora/`;

  list(params?: BitacoraQuery): Observable<PaginatedResponse<BitacoraEntry>> {
    return this.http.get<PaginatedResponse<BitacoraEntry>>(this.base, {
      params: toHttpParams(params as Record<string, string | number | boolean | null | undefined>),
    });
  }
}
