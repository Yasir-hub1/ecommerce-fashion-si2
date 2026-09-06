import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';
import type {
  PaginatedResponse,
  CheckoutSessionData,
  CheckoutSessionStatus,
  ReservationDetail,
  ReservationListItem,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ReservationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reservations`;

  list(params?: Record<string, string | number>): Observable<PaginatedResponse<ReservationListItem>> {
    return this.http.get<PaginatedResponse<ReservationListItem>>(`${this.base}/`, {
      params: toHttpParams(params),
    });
  }

  myReservations(): Observable<PaginatedResponse<ReservationListItem>> {
    return this.http.get<PaginatedResponse<ReservationListItem>>(`${this.base}/my_reservations/`);
  }

  upcoming(): Observable<PaginatedResponse<ReservationListItem>> {
    return this.http.get<PaginatedResponse<ReservationListItem>>(`${this.base}/upcoming/`);
  }

  get(id: number | string): Observable<ReservationDetail> {
    return this.http.get<ReservationDetail>(`${this.base}/${id}/`);
  }

  create(payload: {
    branch_id: number;
    scheduled_for: string;
    items: { variant_id: number; quantity: number }[];
    notes?: string;
  }): Observable<{ message: string; reservation: ReservationDetail }> {
    return this.http.post<{ message: string; reservation: ReservationDetail }>(
      `${this.base}/`,
      payload,
    );
  }

  cancel(id: number, reason = ''): Observable<{ message: string; reservation: ReservationDetail }> {
    return this.http.post<{ message: string; reservation: ReservationDetail }>(
      `${this.base}/${id}/cancel/`,
      { reason },
    );
  }

  transition(
    id: number,
    newStatus: string,
  ): Observable<{ message: string; reservation: ReservationDetail }> {
    return this.http.post<{ message: string; reservation: ReservationDetail }>(
      `${this.base}/${id}/transition/`,
      { new_status: newStatus },
    );
  }
}

@Injectable({ providedIn: 'root' })
export class PaymentsApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  createCheckoutSession(
    orderId: number,
  ): Observable<{ message: string; checkout_session: CheckoutSessionData }> {
    return this.http.post<{ message: string; checkout_session: CheckoutSessionData }>(
      `${this.base}/checkout-session/`,
      { order_id: orderId },
    );
  }

  getSessionStatus(sessionId: string): Observable<CheckoutSessionStatus> {
    return this.http.get<CheckoutSessionStatus>(
      `${this.base}/checkout-session/${sessionId}/status/`,
    );
  }
}
