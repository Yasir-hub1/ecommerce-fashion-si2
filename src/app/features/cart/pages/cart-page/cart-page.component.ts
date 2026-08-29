import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { BranchContextService } from '../../../../core/services/branch-context.service';
import { CartStore } from '../../../../core/services/cart.store';
import { CartApi } from '../../../../core/api/cart.api';
import { NotificationService } from '../../../../core/services/notification.service';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [RouterLink, PricePipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Tu carrito</h1>

    @if (cart.loading()) {
      <p>Cargando carrito…</p>
    } @else if (!cart.cart()?.items?.length) {
      <app-empty-state
        icon="🛒"
        title="Carrito vacío"
        description="Explora el catálogo y agrega prendas con tu talla y color."
      >
        <a routerLink="/ecommerce" class="btn btn--primary">Ver catálogo</a>
      </app-empty-state>
    } @else {
      <div class="cart-layout">
        <div class="items">
          @for (item of cart.cart()!.items; track item.id) {
            <article class="item">
              <div>
                <h2>{{ item.variant.sku }}</h2>
                <p class="meta">
                  {{ item.variant.color_name }} · Talla {{ item.variant.size_name }}
                </p>
                <p class="price">{{ item.line_total | price }}</p>
              </div>
              <div class="qty">
                <button type="button" (click)="updateQty(item.id, item.quantity - 1)" [disabled]="item.quantity <= 1">−</button>
                <span>{{ item.quantity }}</span>
                <button type="button" (click)="updateQty(item.id, item.quantity + 1)">+</button>
              </div>
              <button type="button" class="remove" (click)="remove(item.id)">Eliminar</button>
            </article>
          }
        </div>

        <aside class="summary">
          <h2>Resumen</h2>
          <p>Sucursal: <strong>{{ branchContext.selectedBranch()?.name }}</strong></p>
          <p class="total">Subtotal: {{ cart.subtotal() | price }}</p>
          <button type="button" class="btn btn--primary btn--block" [disabled]="checkingOut()" (click)="checkout()">
            {{ checkingOut() ? 'Procesando…' : 'Ir a pagar' }}
          </button>
        </aside>
      </div>
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0 0 1.5rem; }
    .cart-layout { display: grid; grid-template-columns: 1fr 18rem; gap: 1.5rem; align-items: start; }
    .item {
      display: grid; grid-template-columns: 1fr auto auto; gap: 1rem; align-items: center;
      padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.875rem;
      background: var(--color-surface); margin-bottom: 0.75rem;
    }
    .meta { color: var(--color-muted); font-size: 0.875rem; margin: 0.25rem 0; }
    .price { font-weight: 700; margin: 0; }
    .qty { display: flex; align-items: center; gap: 0.5rem; }
    .qty button {
      width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid var(--color-border);
      background: var(--color-surface-2); cursor: pointer;
    }
    .remove { background: none; border: none; color: #b91c1c; cursor: pointer; font-size: 0.875rem; }
    .summary {
      position: sticky; top: 5rem; padding: 1rem; border-radius: 0.875rem;
      border: 1px solid var(--color-border); background: var(--color-surface);
    }
    .summary h2 { margin: 0 0 0.75rem; font-size: 1.125rem; }
    .total { font-size: 1.125rem; font-weight: 700; margin: 1rem 0; }
    @media (max-width: 768px) { .cart-layout { grid-template-columns: 1fr; } }
  `,
})
export class CartPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly cartApi = inject(CartApi);
  protected readonly cart = inject(CartStore);
  protected readonly branchContext = inject(BranchContextService);
  protected readonly checkingOut = signal(false);

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/ecommerce/carrito' } });
      return;
    }
    void this.cart.refresh();
  }

  async updateQty(itemId: number, quantity: number): Promise<void> {
    if (quantity < 1) return;
    await this.cart.updateQuantity(itemId, quantity);
  }

  async remove(itemId: number): Promise<void> {
    await this.cart.removeItem(itemId);
    this.notifications.info('Producto eliminado del carrito');
  }

  async checkout(): Promise<void> {
    const branchId = this.branchContext.selectedBranchId();
    if (!branchId) {
      this.notifications.warn('Selecciona una sucursal');
      return;
    }

    this.checkingOut.set(true);
    try {
      const res = await firstValueFrom(this.cartApi.checkout(branchId));
      await this.router.navigate(['/ecommerce/checkout', res.order.id]);
    } finally {
      this.checkingOut.set(false);
    }
  }
}
