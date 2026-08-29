import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type { Cart } from '../models/api.models';
import { CartApi } from '../api/cart.api';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly cartApi = inject(CartApi);
  private readonly auth = inject(AuthService);

  private readonly _cart = signal<Cart | null>(null);
  private readonly _loading = signal(false);

  readonly cart = this._cart.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly count = computed(() => this._cart()?.total_items ?? 0);
  readonly subtotal = computed(() => this._cart()?.subtotal ?? '0.00');

  async refresh(): Promise<void> {
    if (!this.auth.isAuthenticated() || !this.auth.isCustomer()) {
      this._cart.set(null);
      return;
    }

    this._loading.set(true);
    try {
      const cart = await firstValueFrom(this.cartApi.get());
      this._cart.set(cart);
    } catch {
      this._cart.set(null);
    } finally {
      this._loading.set(false);
    }
  }

  async addItem(variantId: number, quantity = 1): Promise<void> {
    const res = await firstValueFrom(this.cartApi.addItem(variantId, quantity));
    this._cart.set(res.cart);
  }

  async updateQuantity(itemId: number, quantity: number): Promise<void> {
    const cart = await firstValueFrom(this.cartApi.updateItem(itemId, quantity));
    this._cart.set(cart);
  }

  async removeItem(itemId: number): Promise<void> {
    const cart = await firstValueFrom(this.cartApi.removeItem(itemId));
    this._cart.set(cart);
  }

  async clear(): Promise<void> {
    await firstValueFrom(this.cartApi.clear());
    this._cart.set(null);
  }
}
