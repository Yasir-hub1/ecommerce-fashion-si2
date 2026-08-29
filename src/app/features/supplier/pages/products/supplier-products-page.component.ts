import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CatalogApi } from '../../../../core/api/auth.api';
import type { ProductListItem } from '../../../../core/models/api.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-supplier-products-page',
  standalone: true,
  imports: [RouterLink, PricePipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Productos del catálogo</h1>
    <p class="hint">Vista de lectura de productos y colecciones activas</p>
    @if (!products().length && !loading()) {
      <app-empty-state icon="👕" title="Sin productos" description="El administrador publica productos en el catálogo." />
    } @else {
      @for (p of products(); track p.id) {
        <article class="row">
          <div>
            <a [routerLink]="['/ecommerce/producto', p.id]">{{ p.name }}</a>
            <p>{{ p.collection_name }} · {{ p.brand_name }}</p>
          </div>
          <span>{{ p.base_price | price }}</span>
        </article>
      }
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0; }
    .hint { color: var(--color-muted); margin: 0.25rem 0 1rem; font-size: 0.875rem; }
    .row {
      display: flex; justify-content: space-between; gap: 1rem; align-items: center;
      padding: 0.875rem 1rem; border: 1px solid var(--color-border); border-radius: 0.625rem;
      background: var(--color-surface); margin-bottom: 0.5rem;
    }
    a { color: var(--color-accent); text-decoration: none; font-weight: 600; }
    p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--color-muted); }
  `,
})
export class SupplierProductsPageComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApi);
  protected readonly loading = signal(true);
  protected readonly products = signal<ProductListItem[]>([]);

  ngOnInit(): void { void this.load(); }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.catalogApi.listProducts({}));
      this.products.set(res.results);
    } finally { this.loading.set(false); }
  }
}
