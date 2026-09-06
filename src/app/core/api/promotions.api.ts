import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';
import type { PaginatedResponse } from '../models/api.models';

export interface Promotion {
  id: number;
  code: string;
  name: string;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: string;
  min_order_amount: string;
  max_uses: number | null;
  uses_count: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export interface PromotionValidateResult {
  valid: boolean;
  message?: string;
  promotion?: Promotion;
  discount_amount?: string;
}

@Injectable({ providedIn: 'root' })
export class PromotionsApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string | number | boolean>): Observable<PaginatedResponse<Promotion>> {
    return this.http.get<PaginatedResponse<Promotion>>(`${this.base}/promotions/`, {
      params: toHttpParams(params),
    });
  }

  create(body: Partial<Promotion>): Observable<Promotion> {
    return this.http.post<Promotion>(`${this.base}/promotions/`, body);
  }

  update(id: number, body: Partial<Promotion>): Observable<Promotion> {
    return this.http.patch<Promotion>(`${this.base}/promotions/${id}/`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/promotions/${id}/`);
  }

  validate(code: string, orderAmount: string): Observable<PromotionValidateResult> {
    return this.http.post<PromotionValidateResult>(`${this.base}/promotions/validate/`, {
      code,
      order_amount: orderAmount,
    });
  }
}
