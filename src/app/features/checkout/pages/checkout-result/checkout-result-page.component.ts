import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { OrdersApi } from '../../../../core/api/cart.api';
import { PaymentsApi } from '../../../../core/api/reservations.api';
import type { OrderDetail } from '../../../../core/models/api.models';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-checkout-result-page',
  standalone: true,
  imports: [RouterLink, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="result">
      @if (loading()) {
        <p>Verificando estado del pago…</p>
      } @else if (order()) {
        @if (order()!.status === 'PAID') {
          <div class="success">✓</div>
          <h1>¡Pago confirmado!</h1>
          <p>Orden <strong>{{ order()!.code }}</strong> · {{ order()!.grand_total | price }}</p>
        } @else {
          <div class="pending">⏳</div>
          <h1>Pago en proceso</h1>
          <p>
            Estamos confirmando tu pago. Si acabas de pagar, espera unos segundos y recarga.
          </p>
          <button type="button" class="btn btn--secondary" (click)="reload()">Reintentar</button>
        }
        <a routerLink="/ecommerce/cuenta/pedidos" class="btn btn--primary">Ver mis compras</a>
        <a routerLink="/ecommerce" class="btn btn--ghost">Seguir comprando</a>
      } @else {
        <h1>No encontramos la orden</h1>
        <a routerLink="/ecommerce" class="btn btn--primary">Volver al catálogo</a>
      }
    </div>
  `,
  styles: `
    .result { max-width: 28rem; margin: 2rem auto; text-align: center; display: grid; gap: 0.75rem; }
    .success, .pending { font-size: 2.5rem; }
    h1 { font-family: var(--font-display); margin: 0; }
  `,
})
export class CheckoutResultPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersApi = inject(OrdersApi);
  private readonly paymentsApi = inject(PaymentsApi);

  protected readonly loading = signal(true);
  protected readonly order = signal<OrderDetail | null>(null);
  private sessionId = '';
  private orderCode = '';

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id') ?? '';
    this.orderCode = this.route.snapshot.queryParamMap.get('order') ?? '';
    void this.fetchOrder();
  }

  reload(): void {
    void this.fetchOrder();
  }

  private async fetchOrder(): Promise<void> {
    this.loading.set(true);
    try {
      if (this.sessionId) {
        const session = await firstValueFrom(this.paymentsApi.getSessionStatus(this.sessionId));
        if (session.order_code) {
          this.orderCode = session.order_code;
        }
      }

      if (!this.orderCode) return;

      const list = await firstValueFrom(this.ordersApi.list());
      const found = list.results.find((o) => o.code === this.orderCode);
      if (found) {
        const detail = await firstValueFrom(this.ordersApi.get(found.id));
        this.order.set(detail);
        if (detail.status !== 'PAID') {
          setTimeout(() => void this.fetchOrder(), 3000);
        }
      }
    } finally {
      this.loading.set(false);
    }
  }
}
