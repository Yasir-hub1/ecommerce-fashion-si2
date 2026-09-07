import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { filter, map, switchMap, takeWhile } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';

export type ArAssetKind = 'OVERLAY_2D' | 'MODEL_3D';
export type ArAssetStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface ArAnchorConfig {
  version?: number;
  anchor_left?: { x: number; y: number };
  anchor_right?: { x: number; y: number };
  offset_y?: number;
  width_factor?: number;
  size_scale?: Record<string, number>;
  body_part?: 'TORSO' | 'LEGS' | 'FULL_BODY';
  auto_calibrated?: boolean;
}

export interface ArAsset {
  id: number;
  product: number;
  color: number | null;
  kind: ArAssetKind;
  status: ArAssetStatus;
  source_image?: string | null;
  source_image_url?: string | null;
  file?: string | null;
  file_url?: string | null;
  width?: number;
  height?: number;
  anchor_config: ArAnchorConfig;
  process_error?: string;
  error_message?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  task_id?: string;
}

export interface ArUploadProgress {
  progress: number;
  asset: ArAsset | null;
}

@Injectable({ providedIn: 'root' })
export class ArAssetsApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listByProduct(productId: number): Observable<ArAsset[]> {
    return this.http.get<ArAsset[]>(`${this.base}/products/${productId}/ar-assets/`);
  }

  get(id: number): Observable<ArAsset> {
    return this.http.get<ArAsset>(`${this.base}/ar-assets/${id}/`);
  }

  list(params?: Record<string, string | number | boolean>): Observable<ArAsset[]> {
    return this.http.get<ArAsset[] | { results: ArAsset[] }>(`${this.base}/ar-assets/`, {
      params: toHttpParams(params),
    }).pipe(map((data) => (Array.isArray(data) ? data : data.results)));
  }

  upload(productId: number, file: File, colorId: number | null): Observable<ArUploadProgress> {
    const body = new FormData();
    body.append('source_image', file);
    body.append('kind', 'OVERLAY_2D');
    if (colorId != null) body.append('color', String(colorId));

    return this.http
      .post<ArAsset>(`${this.base}/products/${productId}/ar-assets/`, body, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        filter(
          (event): event is { type: HttpEventType.UploadProgress; loaded: number; total?: number } | HttpResponse<ArAsset> =>
            event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response,
        ),
        map((event): ArUploadProgress => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total ?? file.size;
            return { progress: total ? Math.round((100 * event.loaded) / total) : 0, asset: null };
          }
          return { progress: 100, asset: event.body };
        }),
      );
  }

  pollUntilSettled(id: number): Observable<ArAsset> {
    return timer(0, 3000).pipe(
      switchMap(() => this.get(id)),
      takeWhile((asset) => asset.status === 'PENDING' || asset.status === 'PROCESSING', true),
    );
  }

  update(id: number, body: Partial<Pick<ArAsset, 'anchor_config' | 'is_active' | 'color'>>): Observable<ArAsset> {
    return this.http.patch<ArAsset>(`${this.base}/ar-assets/${id}/`, body);
  }

  retry(id: number): Observable<ArAsset> {
    return this.http.post<ArAsset>(`${this.base}/ar-assets/${id}/retry/`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/ar-assets/${id}/`);
  }
}
