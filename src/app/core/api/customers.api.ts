import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { UserProfile } from '../models/api.models';

export interface CustomerProfile {
  id: number;
  user: number;
  preferred_branch: number | null;
  preferred_branch_name?: string;
  top_size: number | null;
  bottom_size: number | null;
  style_preferences: string;
  gender_preference: string;
}

@Injectable({ providedIn: 'root' })
export class CustomersApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getMe(): Observable<CustomerProfile> {
    return this.http.get<CustomerProfile>(`${this.base}/customers/me/`);
  }

  updateMe(body: Partial<CustomerProfile>): Observable<CustomerProfile> {
    return this.http.patch<CustomerProfile>(`${this.base}/customers/me/`, body);
  }

  updateUserProfile(body: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.base}/users/me/`, body);
  }
}
