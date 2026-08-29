import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';
import type { PaginatedResponse, ProductImage } from '../models/api.models';

export interface ProductImageFilters {
  product?: number;
  color?: number;
  is_primary?: boolean;
}

export interface ProductImageMetaPayload {
  alt_text?: string;
  color?: number | null;
  is_primary?: boolean;
  display_order?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductImagesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/product-images`;

  list(filters?: ProductImageFilters): Observable<PaginatedResponse<ProductImage>> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.product != null) params['product'] = filters.product;
    if (filters?.color != null) params['color'] = filters.color;
    if (filters?.is_primary != null) params['is_primary'] = filters.is_primary;
    return this.http.get<PaginatedResponse<ProductImage>>(`${this.base}/`, {
      params: toHttpParams(params),
    });
  }

  get(id: number): Observable<ProductImage> {
    return this.http.get<ProductImage>(`${this.base}/${id}/`);
  }

  create(formData: FormData): Observable<ProductImage> {
    return this.http.post<ProductImage>(`${this.base}/`, formData);
  }

  update(id: number, formData: FormData): Observable<ProductImage> {
    return this.http.patch<ProductImage>(`${this.base}/${id}/`, formData);
  }

  updateMeta(id: number, body: ProductImageMetaPayload): Observable<ProductImage> {
    return this.http.patch<ProductImage>(`${this.base}/${id}/`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }

  /** Construye FormData para crear/actualizar con archivo */
  buildFormData(
    productId: number,
    file: File | null,
    meta: ProductImageMetaPayload & { alt_text: string },
  ): FormData {
    const fd = new FormData();
    fd.append('product', String(productId));
    if (file) fd.append('image', file);
    fd.append('alt_text', meta.alt_text);
    if (meta.color != null) fd.append('color', String(meta.color));
    fd.append('is_primary', String(meta.is_primary ?? false));
    fd.append('display_order', String(meta.display_order ?? 0));
    return fd;
  }
}
