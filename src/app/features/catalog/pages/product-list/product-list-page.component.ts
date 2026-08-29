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

import { CatalogApi } from '../../../../core/api/auth.api';
import { BranchContextService } from '../../../../core/services/branch-context.service';
import type { Brand, Category, ProductListItem } from '../../../../core/models/api.models';
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
    </section>

    <section class="filters" aria-label="Filtros de catálogo">
      <input
        type="search"
        placeholder="Buscar por nombre, material…"
        [(ngModel)]="searchQuery"
        (ngModelChange)="onFiltersChange()"
      />
      <select [(ngModel)]="categoryId" (ngModelChange)="onFiltersChange()">
        <option value="">Todas las categorías</option>
        @for (c of categories(); track c.id) {
          <option [value]="c.id">{{ c.name }}</option>
        }
      </select>
      <select [(ngModel)]="brandId" (ngModelChange)="onFiltersChange()">
        <option value="">Todas las marcas</option>
        @for (b of brands(); track b.id) {
          <option [value]="b.id">{{ b.name }}</option>
        }
      </select>
      <select [(ngModel)]="ordering" (ngModelChange)="onFiltersChange()">
        <option value="-created_at">Más recientes</option>
        <option value="name">Nombre A–Z</option>
        <option value="-base_price">Mayor precio</option>
        <option value="base_price">Menor precio</option>
      </select>
    </section>

    @if (loading()) {
      <div class="grid skeleton-grid" aria-busy="true">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div class="skeleton-card"></div>
        }
      </div>
    } @else if (products().length === 0) {
      <app-empty-state
        icon="👗"
        title="Sin resultados"
        description="Prueba otros filtros o cambia de sucursal para ver más productos."
      />
    } @else {
      <div class="grid">
        @for (product of products(); track product.id) {
          <a [routerLink]="['/ecommerce/producto', product.id]" class="product-card">
            <div class="product-card__media">
              @if (product.primary_image) {
                <img [src]="product.primary_image" [alt]="product.name" loading="lazy" />
              } @else {
                <div class="placeholder">Sin imagen</div>
              }
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
    .hero { margin-bottom: 1.5rem; }
    .eyebrow {
      text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem;
      color: var(--color-accent); font-weight: 600; margin: 0 0 0.5rem;
    }
    h1 { font-family: var(--font-display); font-size: clamp(2rem, 4vw, 2.75rem); margin: 0 0 0.5rem; }
    .hero__text { color: var(--color-muted); margin: 0; max-width: 36rem; line-height: 1.6; }
    .filters {
      display: grid; grid-template-columns: 2fr repeat(3, 1fr); gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .filters input, .filters select {
      border: 1px solid var(--color-border); border-radius: 0.75rem;
      padding: 0.75rem 0.875rem; background: var(--color-surface); font: inherit;
    }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.25rem;
    }
    .product-card {
      text-decoration: none; color: inherit; background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: 1rem; overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .product-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card); }
    .product-card__media {
      aspect-ratio: 4/5; background: var(--color-surface-2); position: relative; overflow: hidden;
    }
    .product-card__media img { width: 100%; height: 100%; object-fit: cover; }
    .placeholder {
      height: 100%; display: grid; place-items: center; color: var(--color-muted); font-size: 0.875rem;
    }
    .badge {
      position: absolute; top: 0.75rem; left: 0.75rem; font-size: 0.6875rem;
      padding: 0.25rem 0.5rem; border-radius: 999px; font-weight: 600;
    }
    .badge--warn { background: #fef3c7; color: #92400e; }
    .product-card__body { padding: 1rem; }
    .meta { margin: 0 0 0.25rem; font-size: 0.75rem; color: var(--color-muted); }
    h2 { margin: 0 0 0.5rem; font-size: 1rem; line-height: 1.35; font-weight: 600; }
    .price { margin: 0; font-weight: 700; }
    .stock { margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--color-muted); }
    .skeleton-grid .skeleton-card {
      aspect-ratio: 3/4; border-radius: 1rem;
      background: linear-gradient(90deg, var(--color-surface-2), var(--color-border), var(--color-surface-2));
      background-size: 200% 100%; animation: shimmer 1.2s infinite;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
    @media (max-width: 768px) { .filters { grid-template-columns: 1fr; } }
  `,
})
export class ProductListPageComponent {
  private readonly catalogApi = inject(CatalogApi);
  protected readonly branchContext = inject(BranchContextService);

  protected readonly loading = signal(true);
  protected readonly products = signal<ProductListItem[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly brands = signal<Brand[]>([]);

  protected searchQuery = '';
  protected categoryId = '';
  protected brandId = '';
  protected ordering = '-created_at';

  constructor() {
    void this.loadFilters();

    effect(() => {
      const branchId = this.branchContext.selectedBranchId();
      if (branchId) void this.loadProducts();
    });
  }

  onFiltersChange(): void {
    void this.loadProducts();
  }

  private async loadFilters(): Promise<void> {
    const [categories, brands] = await Promise.all([
      firstValueFrom(this.catalogApi.listCategories()),
      firstValueFrom(this.catalogApi.listBrands()),
    ]);
    this.categories.set(categories.results);
    this.brands.set(brands.results);
  }

  private async loadProducts(): Promise<void> {
    const branchId = this.branchContext.selectedBranchId();
    if (!branchId) return;

    this.loading.set(true);
    try {
      const params: Record<string, string | number> = {
        branch: branchId,
        ordering: this.ordering,
      };
      if (this.searchQuery.trim()) params['search'] = this.searchQuery.trim();
      if (this.categoryId) params['category'] = this.categoryId;
      if (this.brandId) params['brand'] = this.brandId;

      const res = await firstValueFrom(this.catalogApi.listProducts(params));
      this.products.set(res.results);
    } finally {
      this.loading.set(false);
    }
  }
}
