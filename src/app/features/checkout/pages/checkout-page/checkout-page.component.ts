import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  loadStripe,
  Stripe,
  StripeCheckoutElementsSdk,
  StripeCheckoutLoadActionsSuccess,
} from '@stripe/stripe-js';
import { firstValueFrom } from 'rxjs';

import { OrdersApi } from '../../../../core/api/cart.api';
import { PaymentsApi } from '../../../../core/api/reservations.api';
import type { OrderDetail } from '../../../../core/models/api.models';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <p>Preparando pago…</p>
    } @else if (order()) {
      <div class="checkout">
        <div>
          <h1>Pagar orden {{ order()!.code }}</h1>
          <p class="total">Total: {{ order()!.grand_total | price }}</p>
          <p class="hint">El pago se confirma de forma segura con Stripe.</p>
        </div>
        <div #paymentMount id="payment-element" class="payment-box"></div>
        <button
          type="button"
          class="btn btn--primary btn--block"
          [disabled]="paying() || !canConfirm()"
          (click)="pay()"
        >
          {{ paying() ? 'Procesando…' : 'Pagar ahora' }}
        </button>
      </div>
    }
  `,
  styles: `
    .checkout { max-width: 32rem; margin: 0 auto; }
    h1 { font-family: var(--font-display); margin: 0 0 0.5rem; }
    .total { font-size: 1.25rem; font-weight: 700; }
    .hint { color: var(--color-muted); margin-bottom: 1rem; }
    .payment-box {
      min-height: 8rem; padding: 1rem; border: 1px solid var(--color-border);
      border-radius: 0.875rem; background: var(--color-surface); margin-bottom: 1rem;
    }
  `,
})
export class CheckoutPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersApi = inject(OrdersApi);
  private readonly paymentsApi = inject(PaymentsApi);

  private stripe: Stripe | null = null;
  private checkout: StripeCheckoutElementsSdk | null = null;
  private actions: StripeCheckoutLoadActionsSuccess | null = null;

  protected readonly loading = signal(true);
  protected readonly paying = signal(false);
  protected readonly canConfirm = signal(false);
  protected readonly order = signal<OrderDetail | null>(null);

  private readonly paymentMount = viewChild<ElementRef<HTMLElement>>('paymentMount');

  async ngOnInit(): Promise<void> {
    const orderId = Number(this.route.snapshot.paramMap.get('orderId'));
    try {
      const order = await firstValueFrom(this.ordersApi.get(orderId));
      this.order.set(order);

      const sessionRes = await firstValueFrom(this.paymentsApi.createCheckoutSession(orderId));
      const { client_secret, publishable_key } = sessionRes.checkout_session;

      this.stripe = await loadStripe(publishable_key);
      if (!this.stripe) throw new Error('Stripe no disponible');

      this.checkout = this.stripe.initCheckoutElementsSdk({
        clientSecret: client_secret,
      });

      this.checkout.on('change', (session) => {
        this.canConfirm.set(session.canConfirm);
      });

      const paymentElement = this.checkout.createPaymentElement();
      const mountEl = this.paymentMount()?.nativeElement;
      if (mountEl) paymentElement.mount(mountEl);

      const loadResult = await this.checkout.loadActions();
      if (loadResult.type === 'success') {
        this.actions = loadResult.actions;
        this.canConfirm.set(loadResult.actions.getSession().canConfirm);
      }
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.actions = null;
    this.checkout = null;
    this.stripe = null;
  }

  async pay(): Promise<void> {
    if (!this.actions || !this.order()) return;

    this.paying.set(true);
    try {
      const confirmResult = await this.actions.confirm();
      if (confirmResult.type === 'error') {
        console.error(confirmResult.error.message);
      }
    } finally {
      this.paying.set(false);
    }
  }
}
