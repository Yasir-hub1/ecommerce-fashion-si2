import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { OrdersApi } from '../../../../core/api/cart.api';
import type { OrderListItem } from '../../../../core/models/api.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { LIST_ROW_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [RouterLink, PricePipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Mis compras</h1>
    @if (loading()) {
      <p>Cargando…</p>
    } @else if (!orders().length) {
      <app-empty-state icon="📦" title="Sin compras" description="Tus pedidos aparecerán aquí." />
    } @else {
      @for (order of orders(); track order.id) {
        <a [routerLink]="['/ecommerce/cuenta/pedidos', order.id]" class="row">
          <div>
            <strong>{{ order.code }}</strong>
            <p class="meta">{{ order.branch_name }} · {{ formatDate(order.created_at) }}</p>
          </div>
          <div class="right">
            <span class="status">{{ order.status_display }}</span>
            <span class="price">{{ order.grand_total | price }}</span>
          </div>
        </a>
      }
    }
  `,
  styles: LIST_ROW_STYLES,
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
