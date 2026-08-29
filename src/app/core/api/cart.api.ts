import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Cart, OrderDetail, OrderListItem, PaginatedResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CartApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/cart`;

  get(): Observable<Cart> {
    return this.http.get<Cart>(`${this.base}/`);
  }

  addItem(variantId: number, quantity = 1): Observable<{ message: string; cart: Cart }> {
    return this.http.post<{ message: string; cart: Cart }>(`${this.base}/add_item/`, {
      variant_id: variantId,
      quantity,
    });
  }

  updateItem(itemId: number, quantity: number): Observable<Cart> {
    return this.http.patch<Cart>(`${this.base}/items/${itemId}/`, { quantity });
  }

  removeItem(itemId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${this.base}/items/${itemId}/`);
  }

  clear(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/clear/`);
  }

  checkout(branchId: number, channel = 'WEB'): Observable<{ message: string; order: OrderDetail }> {
    return this.http.post<{ message: string; order: OrderDetail }>(`${this.base}/checkout/`, {
      branch_id: branchId,
      channel,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/orders`;

  list(): Observable<PaginatedResponse<OrderListItem>> {
    return this.http.get<PaginatedResponse<OrderListItem>>(`${this.base}/`);
  }

  get(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.base}/${id}/`);
  }

  cancel(id: number): Observable<{ message: string; order: OrderDetail }> {
    return this.http.post<{ message: string; order: OrderDetail }>(`${this.base}/${id}/cancel/`, {});
  }
}
