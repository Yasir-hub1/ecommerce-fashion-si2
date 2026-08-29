import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { OrdersApi } from '../../../../core/api/cart.api';
import type { OrderListItem } from '../../../../core/models/api.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [PricePipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Mis compras</h1>
    @if (loading()) {
      <p>Cargando…</p>
    } @else if (!orders().length) {
      <app-empty-state icon="📦" title="Sin compras" description="Tus pedidos aparecerán aquí." />
    } @else {
      @for (order of orders(); track order.id) {
        <article class="row">
          <div>
            <strong>{{ order.code }}</strong>
            <p class="meta">{{ order.branch_name }} · {{ formatDate(order.created_at) }}</p>
          </div>
          <div class="right">
            <span class="status">{{ order.status_display }}</span>
            <span class="price">{{ order.grand_total | price }}</span>
          </div>
        </article>
      }
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0 0 1rem; }
    .row {
      display: flex; justify-content: space-between; gap: 1rem; align-items: center;
      padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.875rem;
      background: var(--color-surface); margin-bottom: 0.75rem;
    }
    .meta { margin: 0.25rem 0 0; color: var(--color-muted); font-size: 0.875rem; }
    .right { text-align: right; display: grid; gap: 0.25rem; }
    .status { font-size: 0.8125rem; color: var(--color-muted); }
    .price { font-weight: 700; }
  `,
})
export class OrdersPageComponent implements OnInit {
  private readonly ordersApi = inject(OrdersApi);

  protected readonly loading = signal(true);
  protected readonly orders = signal<OrderListItem[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  formatDate(value: string): string {
    return format(new Date(value), 'd MMM yyyy HH:mm', { locale: es });
  }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.ordersApi.list());
      this.orders.set(res.results);
    } finally {
      this.loading.set(false);
    }
  }
}
