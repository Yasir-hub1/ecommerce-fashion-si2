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

export interface DashboardKpis {
  readonly total_sales: string;
  readonly total_sales_delta: number;
  readonly order_count: number;
  readonly order_count_delta: number;
  readonly reservation_count: number;
  readonly reservation_count_delta: number;
  readonly conversion_rate: number;
  readonly conversion_rate_delta: number;
  readonly low_stock_count: number;
  readonly catalog_products: number;
  readonly units_on_hand: number;
  readonly units_reserved: number;
}

export interface DashboardPayload {
  readonly period: { readonly days: number; readonly from: string; readonly to: string; readonly label: string };
  readonly kpis: DashboardKpis;
  readonly sales_by_day: ReadonlyArray<{ readonly date: string; readonly total: string; readonly count: number }>;
  readonly sales_by_channel: ReadonlyArray<{
    readonly channel: string;
    readonly label: string;
    readonly total: string;
    readonly count: number;
  }>;
  readonly sales_by_branch: ReadonlyArray<{
    readonly branch_id: number;
    readonly branch_name: string;
    readonly total: string;
    readonly count: number;
  }>;
  readonly reservations_by_status: ReadonlyArray<{
    readonly status: string;
    readonly label: string;
    readonly count: number;
  }>;
  readonly top_products: ReadonlyArray<{
    readonly product_name: string;
    readonly units_sold: number;
    readonly revenue: string;
  }>;
  readonly low_stock_items: ReadonlyArray<{
    readonly branch_code: string;
    readonly sku: string;
    readonly product_name: string;
    readonly on_hand: number;
    readonly min_threshold: number;
  }>;
  readonly recent_orders: ReadonlyArray<{
    readonly id: number;
    readonly code: string;
    readonly branch_name: string;
    readonly channel: string;
    readonly channel_display: string;
    readonly status: string;
    readonly grand_total: string;
    readonly paid_at: string;
  }>;
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

  dashboard(params?: Record<string, string | number>): Observable<DashboardPayload> {
    return this.http.get<DashboardPayload>(`${this.base}/dashboard/`, { params: toHttpParams(params) });
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
