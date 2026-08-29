import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';
import type {
  Branch,
  Category,
  PaginatedResponse,
  ProductDetail,
  ProductListItem,
  UserProfile,
} from '../models/api.models';
import type {
  Brand,
  City,
  Collection,
  Color,
  EmployeeCreatePayload,
  ProductWritePayload,
  Season,
  Size,
  SizeGroup,
  VariantDetail,
  VariantWritePayload,
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class OrgApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listUsers(params?: Record<string, string | number | boolean>): Observable<PaginatedResponse<UserProfile>> {
    return this.http.get<PaginatedResponse<UserProfile>>(`${this.base}/users/`, { params: toHttpParams(params) });
  }

  createUser(body: Partial<UserProfile> & { password?: string }): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.base}/users/`, body);
  }

  updateUser(id: number, body: Partial<UserProfile & { role: string }>): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.base}/users/${id}/`, body);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${id}/`);
  }

  createEmployee(body: EmployeeCreatePayload): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.base}/employees/create/`, body);
  }

  listCities(params?: Record<string, string | number | boolean>): Observable<PaginatedResponse<City>> {
    return this.http.get<PaginatedResponse<City>>(`${this.base}/cities/`, { params: toHttpParams(params) });
  }

  createCity(body: Partial<City>): Observable<City> {
    return this.http.post<City>(`${this.base}/cities/`, body);
  }

  updateCity(id: number, body: Partial<City>): Observable<City> {
    return this.http.patch<City>(`${this.base}/cities/${id}/`, body);
  }

  deleteCity(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/cities/${id}/`);
  }

  listBranches(params?: Record<string, string | number | boolean>): Observable<PaginatedResponse<Branch>> {
    return this.http.get<PaginatedResponse<Branch>>(`${this.base}/branches/`, { params: toHttpParams(params) });
  }

  createBranch(body: Partial<Branch>): Observable<Branch> {
    return this.http.post<Branch>(`${this.base}/branches/`, body);
  }

  updateBranch(id: number, body: Partial<Branch>): Observable<Branch> {
    return this.http.patch<Branch>(`${this.base}/branches/${id}/`, body);
  }

  deleteBranch(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/branches/${id}/`);
  }
}

@Injectable({ providedIn: 'root' })
export class CatalogAdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listCategories(params?: Record<string, string | number | boolean>): Observable<PaginatedResponse<Category>> {
    return this.http.get<PaginatedResponse<Category>>(`${this.base}/categories/`, { params: toHttpParams(params) });
  }

  createCategory(body: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories/`, body);
  }

  updateCategory(id: number, body: Partial<Category>): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/categories/${id}/`, body);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}/`);
  }

  listBrands(): Observable<PaginatedResponse<Brand>> {
    return this.http.get<PaginatedResponse<Brand>>(`${this.base}/brands/`);
  }

  createBrand(body: Partial<Brand>): Observable<Brand> {
    return this.http.post<Brand>(`${this.base}/brands/`, body);
  }

  updateBrand(id: number, body: Partial<Brand>): Observable<Brand> {
    return this.http.patch<Brand>(`${this.base}/brands/${id}/`, body);
  }

  listSizeGroups(): Observable<PaginatedResponse<SizeGroup>> {
    return this.http.get<PaginatedResponse<SizeGroup>>(`${this.base}/size-groups/`);
  }

  createSizeGroup(body: Partial<SizeGroup>): Observable<SizeGroup> {
    return this.http.post<SizeGroup>(`${this.base}/size-groups/`, body);
  }

  listSizes(params?: Record<string, string | number>): Observable<PaginatedResponse<Size>> {
    return this.http.get<PaginatedResponse<Size>>(`${this.base}/sizes/`, { params: toHttpParams(params) });
  }

  createSize(body: Partial<Size>): Observable<Size> {
    return this.http.post<Size>(`${this.base}/sizes/`, body);
  }

  listColors(): Observable<PaginatedResponse<Color>> {
    return this.http.get<PaginatedResponse<Color>>(`${this.base}/colors/`);
  }

  createColor(body: Partial<Color>): Observable<Color> {
    return this.http.post<Color>(`${this.base}/colors/`, body);
  }

  updateColor(id: number, body: Partial<Color>): Observable<Color> {
    return this.http.patch<Color>(`${this.base}/colors/${id}/`, body);
  }

  deleteColor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/colors/${id}/`);
  }

  listSeasons(): Observable<PaginatedResponse<Season>> {
    return this.http.get<PaginatedResponse<Season>>(`${this.base}/seasons/`);
  }

  createSeason(body: Partial<Season>): Observable<Season> {
    return this.http.post<Season>(`${this.base}/seasons/`, body);
  }

  updateSeason(id: number, body: Partial<Season>): Observable<Season> {
    return this.http.patch<Season>(`${this.base}/seasons/${id}/`, body);
  }

  deleteSeason(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/seasons/${id}/`);
  }

  listCollections(params?: Record<string, string | number>): Observable<PaginatedResponse<Collection>> {
    return this.http.get<PaginatedResponse<Collection>>(`${this.base}/collections/`, { params: toHttpParams(params) });
  }

  createCollection(body: Partial<Collection>): Observable<Collection> {
    return this.http.post<Collection>(`${this.base}/collections/`, body);
  }

  updateCollection(id: number, body: Partial<Collection>): Observable<Collection> {
    return this.http.patch<Collection>(`${this.base}/collections/${id}/`, body);
  }

  deleteCollection(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/collections/${id}/`);
  }

  listProducts(params?: Record<string, string | number>): Observable<PaginatedResponse<ProductListItem>> {
    return this.http.get<PaginatedResponse<ProductListItem>>(`${this.base}/products/`, { params: toHttpParams(params) });
  }

  getProduct(id: number): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.base}/products/${id}/`);
  }

  createProduct(body: ProductWritePayload): Observable<ProductDetail> {
    return this.http.post<ProductDetail>(`${this.base}/products/`, body);
  }

  updateProduct(id: number, body: Partial<ProductWritePayload>): Observable<ProductDetail> {
    return this.http.patch<ProductDetail>(`${this.base}/products/${id}/`, body);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/products/${id}/`);
  }

  listVariants(params?: Record<string, string | number>): Observable<PaginatedResponse<VariantDetail>> {
    return this.http.get<PaginatedResponse<VariantDetail>>(`${this.base}/variants/`, { params: toHttpParams(params) });
  }

  createVariant(body: VariantWritePayload): Observable<VariantDetail> {
    return this.http.post<VariantDetail>(`${this.base}/variants/`, body);
  }

  updateVariant(id: number, body: Partial<VariantWritePayload>): Observable<VariantDetail> {
    return this.http.patch<VariantDetail>(`${this.base}/variants/${id}/`, body);
  }

  deleteVariant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/variants/${id}/`);
  }
}
