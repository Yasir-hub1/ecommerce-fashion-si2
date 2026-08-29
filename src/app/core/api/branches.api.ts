import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Branch, PaginatedResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class BranchesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/branches`;

  list(params?: Record<string, string | number>): Observable<PaginatedResponse<Branch>> {
    return this.http.get<PaginatedResponse<Branch>>(`${this.base}/`, {
      params: new HttpParams({ fromObject: params as Record<string, string> }),
    });
  }

  get(id: number): Observable<Branch> {
    return this.http.get<Branch>(`${this.base}/${id}/`);
  }
}
