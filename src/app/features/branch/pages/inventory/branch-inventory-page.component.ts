import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CatalogApi } from '../../../../core/api/auth.api';
import { AuthService } from '../../../../core/auth/auth.service';
import { BranchContextService } from '../../../../core/services/branch-context.service';
import type { ProductListItem } from '../../../../core/models/api.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-branch-inventory-page',
  standalone: true,
  imports: [RouterLink, PricePipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Inventario de sucursal</h1>
    <p class="subtitle">Disponibilidad por variante en tu tienda</p>

    @if (loading()) { <p>Cargando stock…</p> }
    @else if (!products().length) {
      <app-empty-state icon="📦" title="Sin stock visible" description="No hay productos con unidades disponibles en esta sucursal." />
    } @else {
      @for (p of products(); track p.id) {
        <article class="row">
          <div>
            <a [routerLink]="['/ecommerce/producto', p.id]">{{ p.name }}</a>
            <p>{{ p.brand_name }} · {{ p.category_name }}</p>
          </div>
          <div class="right">
            <span class="stock">{{ p.total_available ?? 0 }} uds.</span>
            <span>{{ p.base_price | price }}</span>
          </div>
        </article>
      }
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0; }
    .subtitle { color: var(--color-muted); margin: 0.25rem 0 1rem; }
    .row {
      display: flex; justify-content: space-between; gap: 1rem; align-items: center;
      padding: 0.875rem 1rem; border: 1px solid var(--color-border); border-radius: 0.625rem;
      background: var(--color-surface); margin-bottom: 0.5rem;
    }
    a { color: var(--color-accent); text-decoration: none; font-weight: 600; }
    p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--color-muted); }
    .right { text-align: right; display: grid; gap: 0.25rem; }
    .stock { font-weight: 700; }
  `,
})
export class BranchInventoryPageComponent {
  private readonly catalogApi = inject(CatalogApi);
  private readonly auth = inject(AuthService);
  private readonly branchContext = inject(BranchContextService);

  protected readonly loading = signal(true);
  protected readonly products = signal<ProductListItem[]>([]);

  constructor() {
    effect(() => {
      const branchId = this.auth.user()?.branch_id ?? this.branchContext.selectedBranchId();
      if (branchId) void this.load(branchId);
    });
  }

  private async load(branchId: number): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.catalogApi.listProducts({ branch: branchId }));
      this.products.set(res.results);
    } finally { this.loading.set(false); }
  }
}
