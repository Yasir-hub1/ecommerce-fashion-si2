/**
 * @deprecated Use OrgApi or CatalogAdminApi. Kept for gradual migration.
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CatalogAdminApi, OrgApi } from './catalog-admin.api';
import type { Branch, Category, PaginatedResponse, UserProfile } from '../models/api.models';
import type { Collection, Color, Season, Size } from '../models/admin.models';

export type { City, Color, Size, Season, Collection } from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly org = inject(OrgApi);
  private readonly catalog = inject(CatalogAdminApi);

  listUsers = (): Observable<PaginatedResponse<UserProfile>> => this.org.listUsers();
  updateUser = (id: number, body: Parameters<OrgApi['updateUser']>[1]) => this.org.updateUser(id, body);
  listCities = () => this.org.listCities();
  listBranches = (): Observable<PaginatedResponse<Branch>> => this.org.listBranches();
  listCategories = (): Observable<PaginatedResponse<Category>> => this.catalog.listCategories();
  listSizes = (): Observable<PaginatedResponse<Size>> => this.catalog.listSizes();
  listColors = (): Observable<PaginatedResponse<Color>> => this.catalog.listColors();
  listSeasons = (): Observable<PaginatedResponse<Season>> => this.catalog.listSeasons();
  listCollections = (params?: Record<string, string | number>) => this.catalog.listCollections(params);
}
