import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { OrdersApi } from '../../../../core/api/cart.api';
import type { OrderListItem } from '../../../../core/models/api.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-branch-sales-page',
  standalone: true,
  imports: [EmptyStateComponent, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Ventas de la sucursal</h1>
    @if (!orders().length && !loading()) {
      <app-empty-state icon="💳" title="Sin ventas" description="Las ventas POS y web de tu sucursal aparecerán aquí." />
    } @else {
      @for (o of orders(); track o.id) {
        <article class="row">
          <div>
            <strong>{{ o.code }}</strong>
            <p>{{ o.customer_name }} · {{ fmt(o.created_at) }}</p>
          </div>
          <div class="right">
            <span>{{ o.channel_display }}</span>
            <span>{{ o.grand_total | price }}</span>
          </div>
        </article>
      }
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0 0 1rem; }
    .row {
      display: flex; justify-content: space-between; gap: 1rem; align-items: center;
      padding: 0.875rem 1rem; border: 1px solid var(--color-border); border-radius: 0.625rem;
      background: var(--color-surface); margin-bottom: 0.5rem;
    }
    p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--color-muted); }
    .right { text-align: right; display: grid; gap: 0.25rem; font-size: 0.875rem; }
  `,
})
export class BranchSalesPageComponent implements OnInit {
  private readonly ordersApi = inject(OrdersApi);
  protected readonly loading = signal(true);
  protected readonly orders = signal<OrderListItem[]>([]);

  ngOnInit(): void { void this.load(); }

  fmt(v: string): string {
    return format(new Date(v), 'd MMM yyyy HH:mm', { locale: es });
  }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.ordersApi.list());
      this.orders.set(res.results);
    } finally { this.loading.set(false); }
  }
}
