import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { ProductListItem } from '../models/api.models';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  suggestions?: string[];
}

export interface RecommendationResult {
  products: ProductListItem[];
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class AiApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ai`;

  chat(messages: ChatMessage[], branchId?: number): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.base}/chat/`, {
      messages,
      branch_id: branchId,
    });
  }

  recommendations(params?: {
    branch_id?: number;
    limit?: number;
  }): Observable<RecommendationResult> {
    return this.http.get<RecommendationResult>(`${this.base}/recommendations/`, {
      params: params as Record<string, string | number>,
    });
  }
}
