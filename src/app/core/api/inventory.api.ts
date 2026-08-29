import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';
import type { PaginatedResponse } from '../models/api.models';
import type {
  BranchStock,
  InventoryMovement,
  StockAdjustPayload,
  StockTransferPayload,
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class InventoryApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listStock(params?: Record<string, string | number>): Observable<PaginatedResponse<BranchStock>> {
    return this.http.get<PaginatedResponse<BranchStock>>(`${this.base}/stock/`, { params: toHttpParams(params) });
  }

  lowStock(params?: Record<string, string | number>): Observable<PaginatedResponse<BranchStock>> {
    return this.http.get<PaginatedResponse<BranchStock>>(`${this.base}/stock/low_stock/`, {
      params: toHttpParams(params),
    });
  }

  adjust(body: StockAdjustPayload): Observable<BranchStock> {
    return this.http.post<BranchStock>(`${this.base}/stock/adjust/`, body);
  }

  transfer(body: StockTransferPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/stock/transfer/`, body);
  }

  updateThreshold(id: number, min_threshold: number): Observable<BranchStock> {
    return this.http.patch<BranchStock>(`${this.base}/stock/${id}/threshold/`, { min_threshold });
  }

  listMovements(params?: Record<string, string | number>): Observable<PaginatedResponse<InventoryMovement>> {
    return this.http.get<PaginatedResponse<InventoryMovement>>(`${this.base}/movements/`, {
      params: toHttpParams(params),
    });
  }
}
