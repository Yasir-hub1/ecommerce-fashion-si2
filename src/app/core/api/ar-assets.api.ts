import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';
import type { PaginatedResponse } from '../models/api.models';

export interface ArAsset {
  id: number;
  product: number;
  product_name?: string;
  color: number | null;
  color_name?: string;
  kind: 'MODEL_3D' | 'TEXTURE' | 'OVERLAY';
  file: string;
  file_url?: string;
  label: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class ArAssetsApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string | number | boolean>): Observable<PaginatedResponse<ArAsset>> {
    return this.http.get<PaginatedResponse<ArAsset>>(`${this.base}/ar-assets/`, {
      params: toHttpParams(params),
    });
  }

  create(body: FormData): Observable<ArAsset> {
    return this.http.post<ArAsset>(`${this.base}/ar-assets/`, body);
  }

  update(id: number, body: FormData | Partial<ArAsset>): Observable<ArAsset> {
    return this.http.patch<ArAsset>(`${this.base}/ar-assets/${id}/`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/ar-assets/${id}/`);
  }
}
