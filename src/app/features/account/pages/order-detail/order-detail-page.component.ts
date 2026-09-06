import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { OrdersApi } from '../../../../core/api/cart.api';
import { environment } from '../../../../../environments/environment';
import type { OrderDetail } from '../../../../core/models/api.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-order-detail-page',
  standalone: true,
  imports: [RouterLink, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/ecommerce/cuenta/pedidos" class="back">← Mis compras</a>

    @if (loading()) {
      <p>Cargando pedido…</p>
    } @else if (order(); as o) {
      <header class="head">
        <div>
          <h1>{{ o.code }}</h1>
          <p class="meta">{{ o.branch_name }} · {{ fmt(o.created_at) }}</p>
        </div>
        <span class="status">{{ o.status_display }}</span>
      </header>

      <section class="card">
        <h2>Ítems</h2>
        @for (item of o.items; track item.id) {
          <div class="line">
            <div>
              <strong>{{ item.product_name }}</strong>
              <p>{{ item.variant.color_name }} · Talla {{ item.variant.size_name }}</p>
            </div>
            <span>{{ item.quantity }} × {{ item.unit_price | price }}</span>
            <span class="total">{{ item.line_total | price }}</span>
          </div>
        }
        <div class="grand">
          <span>Total</span>
          <strong>{{ o.grand_total | price }}</strong>
        </div>
      </section>

      @if (o.status === 'PAID' || o.status === 'COMPLETED') {
        <button type="button" class="btn btn--primary" (click)="downloadReceipt()">
          Descargar comprobante PDF
        </button>
      }
    }
  `,
  styles: `
    .back { color: var(--color-muted); font-size: 0.875rem; text-decoration: none; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; margin: 0.75rem 0 1rem; }
    h1 { font-family: var(--font-display); margin: 0; font-size: 1.5rem; }
    .meta { color: var(--color-muted); margin: 0.25rem 0 0; font-size: 0.875rem; }
    .status { font-size: 0.8125rem; padding: 0.25rem 0.625rem; border-radius: 999px; background: var(--color-surface-2); }
    .card {
      border: 1px solid var(--color-border); border-radius: 0.875rem; padding: 1rem;
      background: var(--color-surface); margin-bottom: 1rem;
    }
    h2 { margin: 0 0 0.75rem; font-size: 1rem; }
    .line {
      display: grid; grid-template-columns: 1fr auto auto; gap: 0.75rem; align-items: center;
      padding: 0.5rem 0; border-bottom: 1px solid var(--color-border);
    }
    .line p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--color-muted); }
    .total { font-weight: 600; }
    .grand { display: flex; justify-content: space-between; margin-top: 0.75rem; font-size: 1.125rem; }
  `,
})
export class OrderDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersApi = inject(OrdersApi);
  private readonly notifications = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly order = signal<OrderDetail | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  fmt(v: string): string {
    return format(new Date(v), 'd MMM yyyy HH:mm', { locale: es });
  }

  async downloadReceipt(): Promise<void> {
    const o = this.order();
    if (!o) return;
    try {
      const receipt = await firstValueFrom(this.ordersApi.getReceipt(o.id));
      window.open(receipt.pdf_url, '_blank');
    } catch {
      const url = `${environment.apiUrl}/orders/${o.id}/receipt/pdf/`;
      window.open(url, '_blank');
      this.notifications.warn('Descarga directa — verifica que el endpoint de comprobantes esté activo');
    }
  }

  private async load(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try {
      this.order.set(await firstValueFrom(this.ordersApi.get(id)));
    } finally {
      this.loading.set(false);
    }
  }
}
