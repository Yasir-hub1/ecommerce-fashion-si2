import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';
import type { PaginatedResponse } from '../models/api.models';
import type { PurchaseReceipt, Supplier } from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class SuppliersApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listSuppliers(params?: Record<string, string | number | boolean>): Observable<PaginatedResponse<Supplier>> {
    return this.http.get<PaginatedResponse<Supplier>>(`${this.base}/suppliers/`, { params: toHttpParams(params) });
  }

  createSupplier(body: Partial<Supplier>): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.base}/suppliers/`, body);
  }

  updateSupplier(id: number, body: Partial<Supplier>): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.base}/suppliers/${id}/`, body);
  }

  deleteSupplier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/suppliers/${id}/`);
  }

  listReceipts(params?: Record<string, string | number>): Observable<PaginatedResponse<PurchaseReceipt>> {
    return this.http.get<PaginatedResponse<PurchaseReceipt>>(`${this.base}/purchase-receipts/`, {
      params: toHttpParams(params),
    });
  }

  getReceipt(id: number): Observable<PurchaseReceipt> {
    return this.http.get<PurchaseReceipt>(`${this.base}/purchase-receipts/${id}/`);
  }

  createReceipt(body: Partial<PurchaseReceipt>): Observable<PurchaseReceipt> {
    return this.http.post<PurchaseReceipt>(`${this.base}/purchase-receipts/`, body);
  }

  updateReceipt(id: number, body: Partial<PurchaseReceipt>): Observable<PurchaseReceipt> {
    return this.http.patch<PurchaseReceipt>(`${this.base}/purchase-receipts/${id}/`, body);
  }

  confirmReceipt(id: number): Observable<PurchaseReceipt> {
    return this.http.post<PurchaseReceipt>(`${this.base}/purchase-receipts/${id}/confirm/`, {});
  }

  cancelReceipt(id: number, reason?: string): Observable<PurchaseReceipt> {
    return this.http.post<PurchaseReceipt>(`${this.base}/purchase-receipts/${id}/cancel/`, { reason: reason ?? '' });
  }
}
