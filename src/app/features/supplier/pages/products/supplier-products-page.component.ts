import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import type { ProductListItem } from '../../../../core/models/api.models';
import { StaffContextService } from '../../../../core/services/staff-context.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { LIST_ROW_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-supplier-products-page',
  standalone: true,
  imports: [RouterLink, PricePipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Productos del catálogo</h1>
    <p class="hint">Vista de lectura de productos en tus colecciones</p>
    @if (loading()) { <p>Cargando…</p> }
    @else if (!products().length) {
      <app-empty-state icon="👕" title="Sin productos" description="No hay productos publicados en tus colecciones." />
    } @else {
      @for (p of products(); track p.id) {
        <article class="row">
          <div>
            <a [routerLink]="['/ecommerce/producto', p.id]">{{ p.name }}</a>
            <p>{{ p.collection_name }} · {{ p.brand_name }}</p>
          </div>
          <span class="price">{{ p.base_price | price }}</span>
        </article>
      }
    }
  `,
  styles: LIST_ROW_STYLES,
})
export class SupplierProductsPageComponent implements OnInit {
  private readonly catalog = inject(CatalogAdminApi);
  private readonly staff = inject(StaffContextService);

  protected readonly loading = signal(true);
  protected readonly products = signal<ProductListItem[]>([]);

  ngOnInit(): void { void this.load(); }

  private async load(): Promise<void> {
    try {
      if (this.staff.isSupplier()) {
        const supplierId = await this.staff.resolveSupplierId();
        if (!supplierId) {
          this.products.set([]);
          return;
        }
        const collectionsRes = await firstValueFrom(
          this.catalog.listCollections({ supplier: supplierId }),
        );
        const collectionIds = collectionsRes.results.map((c) => c.id);
        if (!collectionIds.length) {
          this.products.set([]);
          return;
        }
        const batches = await Promise.all(
          collectionIds.map((id) =>
            firstValueFrom(this.catalog.listProducts({ collection: id })),
          ),
        );
        const merged = batches.flatMap((res) => res.results);
        const unique = [...new Map(merged.map((p) => [p.id, p])).values()];
        this.products.set(unique);
      } else {
        const res = await firstValueFrom(this.catalog.listProducts({}));
        this.products.set(res.results);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
