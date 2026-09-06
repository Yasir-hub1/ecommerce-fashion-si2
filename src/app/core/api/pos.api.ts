import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';
import type {
  PaginatedResponse,
  ReservationDetail,
} from '../models/api.models';
import type {
  PosCheckoutResponse,
  PosDailySummary,
  PosPaymentInput,
  PosPaymentPreview,
  PosQuote,
  PosReceiptMeta,
  PosSaleListItem,
  PosSearchResponse,
  PosSearchResult,
} from '../models/pos.models';

@Injectable({ providedIn: 'root' })
export class PosApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/pos`;

  search(q: string, limit = 20, branchId?: number): Observable<PosSearchResponse> {
    return this.http.get<PosSearchResponse>(`${this.base}/search/`, {
      params: toHttpParams({ q, limit, branch_id: branchId }),
    });
  }

  lookup(barcode: string, branchId?: number): Observable<PosSearchResult> {
    return this.http.get<PosSearchResult>(`${this.base}/lookup/`, {
      params: toHttpParams({ barcode, branch_id: branchId }),
    });
  }

  quote(
    items: { variant_id: number; quantity: number }[],
    branchId?: number,
  ): Observable<PosQuote> {
    return this.http.post<PosQuote>(`${this.base}/quote/`, {
      items,
      branch_id: branchId,
    });
  }

  previewPayments(
    items: { variant_id: number; quantity: number }[],
    payments: PosPaymentInput[],
    branchId?: number,
  ): Observable<PosPaymentPreview> {
    return this.http.post<PosPaymentPreview>(`${this.base}/payments/preview/`, {
      items,
      payments,
      branch_id: branchId,
    });
  }

  checkout(payload: {
    items: { variant_id: number; quantity: number }[];
    payments: PosPaymentInput[];
    customer_id?: number;
    reservation_id?: number;
    branch_id?: number;
  }): Observable<PosCheckoutResponse> {
    return this.http.post<PosCheckoutResponse>(`${this.base}/sales/checkout/`, payload);
  }

  lookupReservation(
    params: { code?: string; id?: number },
    branchId?: number,
  ): Observable<ReservationDetail> {
    return this.http.get<ReservationDetail>(`${this.base}/reservations/lookup/`, {
      params: toHttpParams({ ...params, branch_id: branchId } as Record<string, string | number>),
    });
  }

  getReceipt(orderId: number): Observable<PosReceiptMeta> {
    return this.http.get<PosReceiptMeta>(`${this.base}/sales/${orderId}/receipt/`);
  }

  receiptPdfUrl(orderId: number): string {
    return `${this.base}/sales/${orderId}/receipt/pdf/`;
  }

  downloadReceiptPdf(orderId: number): Observable<Blob> {
    return this.http.get(`${this.base}/sales/${orderId}/receipt/pdf/`, {
      responseType: 'blob',
    });
  }

  dailySummary(date?: string, branchId?: number): Observable<PosDailySummary> {
    return this.http.get<PosDailySummary>(`${this.base}/daily-summary/`, {
      params: toHttpParams({ date, branch_id: branchId }),
    });
  }

  listSales(params?: Record<string, string | number>): Observable<PaginatedResponse<PosSaleListItem>> {
    return this.http.get<PaginatedResponse<PosSaleListItem>>(`${this.base}/sales/`, {
      params: toHttpParams(params),
    });
  }

  getSale(id: number): Observable<PosCheckoutResponse['order']> {
    return this.http.get<PosCheckoutResponse['order']>(`${this.base}/sales/${id}/`);
  }
}

/** Abre PDF autenticado vía HttpClient (JWT en interceptor). */
export function openPosReceiptPdf(posApi: PosApi, orderId: number): void {
  posApi.downloadReceiptPdf(orderId).subscribe({
    next: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}
