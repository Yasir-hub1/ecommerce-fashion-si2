import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AiApi } from '../../../../core/api/ai.api';
import { CatalogApi } from '../../../../core/api/auth.api';
import { BranchContextService } from '../../../../core/services/branch-context.service';
import type { Brand, Category, ProductListItem } from '../../../../core/models/api.models';
import type { Collection, Season } from '../../../../core/models/admin.models';
import { GENDERS } from '../../../../core/models/admin.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PricePipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <div>
        <p class="eyebrow">Nueva temporada</p>
        <h1>Descubre tu estilo</h1>
        <p class="hero__text">
          Explora el catálogo con disponibilidad en
          <strong>{{ branchContext.selectedBranch()?.name ?? 'tu sucursal' }}</strong>.
        </p>
      </div>
      <a routerLink="/ecommerce/reserva" class="btn btn--secondary">Reservar varias prendas</a>
    </section>

    @if (recommended().length) {
      <section class="reco" aria-label="Recomendaciones">
        <h2 class="reco__title">Para ti</h2>
        <p class="reco__reason">{{ recoReason() }}</p>
        <div class="reco__grid">
          @for (p of recommended(); track p.id) {
            <a [routerLink]="['/ecommerce/producto', p.id]" class="reco-card">{{ p.name }}</a>
          }
        </div>
      </section>
    }

    <section class="filters" aria-label="Filtros de catálogo">
      <input type="search" placeholder="Buscar…" [(ngModel)]="searchQuery" (ngModelChange)="onFiltersChange()" />
      <select [(ngModel)]="categoryId" (ngModelChange)="onFiltersChange()">
        <option value="">Categoría</option>
        @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
      </select>
      <select [(ngModel)]="brandId" (ngModelChange)="onFiltersChange()">
        <option value="">Marca</option>
        @for (b of brands(); track b.id) { <option [value]="b.id">{{ b.name }}</option> }
      </select>
      <select [(ngModel)]="seasonId" (ngModelChange)="onSeasonChange()">
        <option value="">Temporada</option>
        @for (s of seasons(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
      </select>
      <select [(ngModel)]="collectionId" (ngModelChange)="onFiltersChange()">
        <option value="">Colección</option>
        @for (c of collections(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
      </select>
      <select [(ngModel)]="gender" (ngModelChange)="onFiltersChange()">
        <option value="">Género</option>
        @for (g of genders; track g.value) { <option [value]="g.value">{{ g.label }}</option> }
      </select>
      <input type="number" placeholder="Precio min" [(ngModel)]="minPrice" (ngModelChange)="onFiltersChange()" />
      <input type="number" placeholder="Precio max" [(ngModel)]="maxPrice" (ngModelChange)="onFiltersChange()" />
      <select [(ngModel)]="ordering" (ngModelChange)="onFiltersChange()">
        <option value="-created_at">Más recientes</option>
        <option value="name">Nombre A–Z</option>
        <option value="-base_price">Mayor precio</option>
        <option value="base_price">Menor precio</option>
      </select>
    </section>

    @if (loading()) {
      <div class="grid skeleton-grid" aria-busy="true">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="skeleton-card"></div> }
      </div>
    } @else if (products().length === 0) {
      <app-empty-state icon="👗" title="Sin resultados" description="Prueba otros filtros o cambia de sucursal." />
    } @else {
      <div class="grid">
        @for (product of products(); track product.id) {
          <a [routerLink]="['/ecommerce/producto', product.id]" class="product-card">
            <div class="product-card__media">
              @if (product.primary_image) {
                <img [src]="product.primary_image" [alt]="product.name" loading="lazy" />
              } @else { <div class="placeholder">Sin imagen</div> }
              @if (product.total_available !== undefined && product.total_available <= 3 && product.total_available > 0) {
                <span class="badge badge--warn">Últimas unidades</span>
              }
            </div>
            <div class="product-card__body">
              <p class="meta">{{ product.brand_name }} · {{ product.category_name }}</p>
              <h2>{{ product.name }}</h2>
              <p class="price">{{ product.base_price | price }}</p>
              @if (product.total_available !== undefined) {
                <p class="stock">{{ product.total_available }} disp.</p>
              }
            </div>
          </a>
        }
      </div>
    }
  `,
  styles: `
    .hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem; color: var(--color-accent); font-weight: 600; margin: 0 0 0.5rem; }
    h1 { font-family: var(--font-display); font-size: clamp(2rem, 4vw, 2.75rem); margin: 0 0 0.5rem; }
    .hero__text { color: var(--color-muted); margin: 0; max-width: 36rem; line-height: 1.6; }
    .reco { margin-bottom: 1.5rem; padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.875rem; background: var(--color-surface); }
    .reco__title { margin: 0 0 0.25rem; font-size: 1rem; }
    .reco__reason { margin: 0 0 0.75rem; font-size: 0.8125rem; color: var(--color-muted); }
    .reco__grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .reco-card { padding: 0.4rem 0.75rem; border-radius: 999px; background: var(--color-surface-2); text-decoration: none; color: inherit; font-size: 0.875rem; }
    .filters { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.5rem; margin-bottom: 1.5rem; }
    .filters input, .filters select { border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 0.65rem 0.75rem; background: var(--color-surface); font: inherit; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.25rem; }
    .product-card { text-decoration: none; color: inherit; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 1rem; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .product-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card); }
    .product-card__media { aspect-ratio: 4/5; background: var(--color-surface-2); position: relative; overflow: hidden; }
    .product-card__media img { width: 100%; height: 100%; object-fit: cover; }
    .placeholder { height: 100%; display: grid; place-items: center; color: var(--color-muted); font-size: 0.875rem; }
    .badge { position: absolute; top: 0.75rem; left: 0.75rem; font-size: 0.6875rem; padding: 0.25rem 0.5rem; border-radius: 999px; font-weight: 600; }
    .badge--warn { background: #fef3c7; color: #92400e; }
    .product-card__body { padding: 1rem; }
    .meta { margin: 0 0 0.25rem; font-size: 0.75rem; color: var(--color-muted); }
    h2 { margin: 0 0 0.5rem; font-size: 1rem; line-height: 1.35; font-weight: 600; }
    .price { margin: 0; font-weight: 700; }
    .stock { margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--color-muted); }
    .skeleton-grid .skeleton-card { aspect-ratio: 3/4; border-radius: 1rem; background: linear-gradient(90deg, var(--color-surface-2), var(--color-border), var(--color-surface-2)); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `,
})
export class ProductListPageComponent {
  private readonly catalogApi = inject(CatalogApi);
  private readonly aiApi = inject(AiApi);
  protected readonly branchContext = inject(BranchContextService);

  protected readonly genders = GENDERS;
  protected readonly loading = signal(true);
  protected readonly products = signal<ProductListItem[]>([]);
  protected readonly recommended = signal<ProductListItem[]>([]);
  protected readonly recoReason = signal('');
  protected readonly categories = signal<Category[]>([]);
  protected readonly brands = signal<Brand[]>([]);
  protected readonly seasons = signal<Season[]>([]);
  protected readonly collections = signal<Collection[]>([]);

  protected searchQuery = '';
  protected categoryId = '';
  protected brandId = '';
  protected seasonId = '';
  protected collectionId = '';
  protected gender = '';
  protected minPrice = '';
  protected maxPrice = '';
  protected ordering = '-created_at';

  constructor() {
    void this.loadFilters();
    void this.loadRecommendations();

    effect(() => {
      const branchId = this.branchContext.selectedBranchId();
      if (branchId) void this.loadProducts();
    });
  }

  onFiltersChange(): void {
    void this.loadProducts();
  }

  onSeasonChange(): void {
    void this.loadCollectionsForSeason();
    this.collectionId = '';
    void this.loadProducts();
  }

  private async loadFilters(): Promise<void> {
    const [categories, brands, seasons] = await Promise.all([
      firstValueFrom(this.catalogApi.listCategories()),
      firstValueFrom(this.catalogApi.listBrands()),
      firstValueFrom(this.catalogApi.listSeasons()),
    ]);
    this.categories.set(categories.results);
    this.brands.set(brands.results);
    this.seasons.set(seasons.results);
    await this.loadCollectionsForSeason();
  }

  private async loadCollectionsForSeason(): Promise<void> {
    const params: Record<string, string | number> = {};
    if (this.seasonId) params['season'] = this.seasonId;
    const res = await firstValueFrom(this.catalogApi.listCollections(params));
    this.collections.set(res.results);
  }

  private async loadRecommendations(): Promise<void> {
    const branchId = this.branchContext.selectedBranchId();
    try {
      const res = await firstValueFrom(this.aiApi.recommendations({ branch_id: branchId ?? undefined, limit: 6 }));
      this.recommended.set(res.products);
      this.recoReason.set(res.reason);
    } catch {
      const branchId2 = this.branchContext.selectedBranchId();
      if (!branchId2) return;
      const fallback = await firstValueFrom(this.catalogApi.listProducts({ branch: branchId2, ordering: '-created_at' }));
      this.recommended.set(fallback.results.slice(0, 4));
      this.recoReason.set('Destacados del catálogo en tu sucursal');
    }
  }

  private async loadProducts(): Promise<void> {
    const branchId = this.branchContext.selectedBranchId();
    if (!branchId) return;

    this.loading.set(true);
    try {
      const params: Record<string, string | number> = { branch: branchId, ordering: this.ordering };
      if (this.searchQuery.trim()) params['search'] = this.searchQuery.trim();
      if (this.categoryId) params['category'] = this.categoryId;
      if (this.brandId) params['brand'] = this.brandId;
      if (this.collectionId) params['collection'] = this.collectionId;
      if (this.gender) params['gender'] = this.gender;
      if (this.minPrice) params['base_price__gte'] = this.minPrice;
      if (this.maxPrice) params['base_price__lte'] = this.maxPrice;

      const res = await firstValueFrom(this.catalogApi.listProducts(params));
      this.products.set(res.results);
    } finally {
      this.loading.set(false);
    }
  }
}
