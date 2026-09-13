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
    <section class="hero anim-rise">
      <div class="hero__copy">
        <p class="brand-lockup">VETA</p>
        <h1>Prueba en tienda. Lleva lo que te queda.</h1>
        <p class="hero__text">
          Stock real en
          <strong>{{ branchContext.selectedBranch()?.name ?? 'tu sucursal' }}</strong>.
          Reserva el probador o compra online.
        </p>
      </div>
      <a routerLink="/ecommerce/reserva" class="btn btn--secondary hero__cta">Armar reserva</a>
    </section>

    @if (recommended().length) {
      <section class="reco anim-fade" aria-label="Recomendaciones">
        <div class="reco__head">
          <h2 class="reco__title">Selección para ti</h2>
          <p class="reco__reason">{{ recoReason() }}</p>
        </div>
        <div class="reco__grid">
          @for (p of recommended(); track p.id) {
            <a [routerLink]="['/ecommerce/producto', p.id]" class="reco-card">{{ p.name }}</a>
          }
        </div>
      </section>
    }

    <section class="filters" aria-label="Filtros de catálogo">
      <input type="search" placeholder="Buscar prenda…" [(ngModel)]="searchQuery" (ngModelChange)="onFiltersChange()" />
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
      <app-empty-state icon="" title="Nada con esos filtros" description="Cambia filtros o prueba otra sucursal." />
    } @else {
      <div class="grid">
        @for (product of products(); track product.id; let i = $index) {
          <a
            [routerLink]="['/ecommerce/producto', product.id]"
            class="product-card"
            [style.animation-delay]="(i % 6) * 40 + 'ms'"
          >
            <div class="product-card__media">
              @if (product.primary_image) {
                <img [src]="product.primary_image" [alt]="product.name" loading="lazy" />
              } @else { <div class="placeholder">Sin imagen</div> }
              @if (product.total_available !== undefined && product.total_available <= 3 && product.total_available > 0) {
                <span class="badge badge--warn">Quedan {{ product.total_available }}</span>
              }
            </div>
            <div class="product-card__body">
              <p class="meta">{{ product.brand_name }} · {{ product.category_name }}</p>
              <h2>{{ product.name }}</h2>
              <div class="product-card__foot">
                <p class="price">{{ product.base_price | price }}</p>
                @if (product.total_available !== undefined) {
                  <p class="stock">{{ product.total_available }} en tienda</p>
                }
              </div>
            </div>
          </a>
        }
      </div>
    }
  `,
  styles: `
    .hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1.5rem;
      align-items: end;
      margin: -0.25rem 0 2rem;
      padding: 1.75rem 0 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }
    .brand-lockup {
      margin: 0 0 0.75rem;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: clamp(2.75rem, 8vw, 4.5rem);
      letter-spacing: -0.06em;
      line-height: 0.9;
      color: var(--color-ink);
    }
    h1 {
      font-family: var(--font-display);
      font-size: clamp(1.35rem, 2.8vw, 1.85rem);
      font-weight: 600;
      letter-spacing: -0.03em;
      margin: 0 0 0.65rem;
      max-width: 22ch;
      line-height: 1.15;
    }
    .hero__text { color: var(--color-muted); margin: 0; max-width: 34rem; line-height: 1.6; }
    .hero__cta { align-self: end; }

    .reco {
      margin-bottom: 1.5rem;
      padding: 1rem 1.1rem;
      border-left: 3px solid var(--color-accent);
      background: var(--color-surface);
    }
    .reco__title {
      margin: 0 0 0.2rem;
      font-family: var(--font-display);
      font-size: 1rem;
      letter-spacing: -0.02em;
    }
    .reco__reason { margin: 0 0 0.75rem; font-size: 0.8125rem; color: var(--color-muted); }
    .reco__grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .reco-card {
      padding: 0.4rem 0.75rem;
      border-radius: var(--radius-sm);
      background: var(--color-surface-2);
      text-decoration: none;
      color: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background var(--duration-fast) var(--ease-out);
    }
    .reco-card:hover { background: var(--color-accent-soft); }

    .filters {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .filters input, .filters select {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 0.65rem 0.75rem;
      background: var(--color-surface);
      font: inherit;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.1rem;
    }
    .product-card {
      text-decoration: none;
      color: inherit;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      overflow: hidden;
      animation: veta-rise var(--duration-med) var(--ease-out) both;
      transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
    }
    .product-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-lift);
      border-color: var(--color-ink);
    }
    .product-card__media {
      aspect-ratio: 4/5;
      background: var(--color-surface-2);
      position: relative;
      overflow: hidden;
    }
    .product-card__media img {
      width: 100%; height: 100%; object-fit: cover;
      transition: transform 0.45s var(--ease-out);
    }
    .product-card:hover .product-card__media img { transform: scale(1.04); }
    .placeholder { height: 100%; display: grid; place-items: center; color: var(--color-muted); font-size: 0.875rem; }
    .badge {
      position: absolute; top: 0.75rem; left: 0.75rem;
      font-size: 0.6875rem; padding: 0.3rem 0.5rem;
      font-weight: 700; letter-spacing: 0.02em;
      background: var(--color-ink); color: #fff;
    }
    .badge--warn { background: var(--color-accent); }
    .product-card__body { padding: 0.9rem 1rem 1.05rem; }
    .meta {
      margin: 0 0 0.3rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-muted);
    }
    h2 {
      margin: 0 0 0.65rem;
      font-family: var(--font-display);
      font-size: 1.05rem;
      line-height: 1.25;
      font-weight: 650;
      letter-spacing: -0.02em;
    }
    .product-card__foot {
      display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem;
    }
    .price { margin: 0; font-weight: 700; }
    .stock { margin: 0; font-size: 0.75rem; color: var(--color-teal); font-weight: 500; }
    .skeleton-grid .skeleton-card {
      aspect-ratio: 3/4;
      background: linear-gradient(90deg, var(--color-surface-2), var(--color-border), var(--color-surface-2));
      background-size: 200% 100%;
      animation: veta-shimmer 1.2s infinite;
    }
    @media (max-width: 720px) {
      .hero { grid-template-columns: 1fr; }
      .hero__cta { width: 100%; }
    }
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
