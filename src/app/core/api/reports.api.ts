import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';
import type { PaginatedResponse } from '../models/api.models';

export interface ReportSummary {
  total_sales: string;
  order_count: number;
  reservation_count: number;
  conversion_rate: number;
  low_stock_count: number;
  top_products: { product_name: string; units_sold: number; revenue: string }[];
}

export interface ReportRequest {
  id: number;
  report_type: string;
  status: string;
  prompt: string;
  result_text: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports`;

  summary(params?: Record<string, string | number>): Observable<ReportSummary> {
    return this.http.get<ReportSummary>(`${this.base}/summary/`, { params: toHttpParams(params) });
  }

  list(params?: Record<string, string | number>): Observable<PaginatedResponse<ReportRequest>> {
    return this.http.get<PaginatedResponse<ReportRequest>>(`${this.base}/`, { params: toHttpParams(params) });
  }

  generate(body: { prompt: string; report_type?: string; branch_id?: number }): Observable<ReportRequest> {
    return this.http.post<ReportRequest>(`${this.base}/generate/`, body);
  }

  /** Descarga CSV con JWT (no usar window.open). */
  exportCsv(
    reportType: string,
    params?: Record<string, string | number>,
  ): Observable<Blob> {
    return this.http.get(`${this.base}/export/${reportType}/`, {
      params: toHttpParams(params),
      responseType: 'blob',
    });
  }
}

/** Dispara descarga de un Blob CSV en el navegador. */
export function downloadCsvBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
