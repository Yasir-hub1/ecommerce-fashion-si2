import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { OrdersApi } from '../../../../core/api/cart.api';
import type { OrderListItem } from '../../../../core/models/api.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { LIST_ROW_STYLES } from '../../../../shared/styles/admin-crud.styles';

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
            <span class="status">{{ o.channel_display }}</span>
            <span class="price">{{ o.grand_total | price }}</span>
          </div>
        </article>
      }
    }
  `,
  styles: LIST_ROW_STYLES,
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
