import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { CatalogApi } from '../../../../core/api/auth.api';
import { PosApi } from '../../../../core/api/reservations.api';
import { NotificationService } from '../../../../core/services/notification.service';
import type { ProductListItem, ProductVariant } from '../../../../core/models/api.models';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

interface PosLine {
  variant: ProductVariant;
  productName: string;
  quantity: number;
  unitPrice: string;
}

@Component({
  selector: 'app-pos-sale-page',
  standalone: true,
  imports: [FormsModule, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pos">
      <header>
        <h1>Caja · POS</h1>
        <p class="hint">Enter agrega · F2 cobra · Optimizado para teclado</p>
      </header>

      <div class="pos__grid">
        <section class="search-panel">
          <input
            #searchInput
            type="text"
            placeholder="Código, SKU o nombre…"
            [(ngModel)]="query"
            (keydown.enter)="search()"
          />
          <button type="button" class="btn btn--secondary" (click)="search()">Buscar</button>

          @if (searchResults().length) {
            <ul class="results">
              @for (p of searchResults(); track p.id) {
                <li>
                  <button type="button" (click)="loadProductVariants(p)">{{ p.name }}</button>
                </li>
              }
            </ul>
          }

          @if (variantOptions().length) {
            <div class="variants">
              <p>Selecciona variante:</p>
              @for (v of variantOptions(); track v.id) {
                <button type="button" class="chip" (click)="addLine(v)">
                  {{ v.size_name }} · {{ v.color_name }} · {{ v.effective_price | price }}
                </button>
              }
            </div>
          }
        </section>

        <section class="sale-panel">
          <h2>Venta actual</h2>
          @if (!lines().length) {
            <p class="empty">Escanea o busca un producto</p>
          } @else {
            @for (line of lines(); track line.variant.id) {
              <div class="line">
                <div>
                  <strong>{{ line.productName }}</strong>
                  <p>{{ line.variant.size_name }} · {{ line.variant.color_name }}</p>
                </div>
                <div class="line__qty">
                  <button type="button" (click)="changeQty(line.variant.id, -1)">−</button>
                  <span>{{ line.quantity }}</span>
                  <button type="button" (click)="changeQty(line.variant.id, 1)">+</button>
                </div>
                <span>{{ lineTotal(line) | price }}</span>
              </div>
            }
          }

          <div class="totals">
            <label>
              Efectivo recibido
              <input type="number" step="0.01" [(ngModel)]="receivedAmount" />
            </label>
            <p>Total: <strong>{{ grandTotal() | price }}</strong></p>
            @if (changeAmount() >= 0) {
              <p>Vuelto: {{ changeAmount() | price }}</p>
            }
            <button type="button" class="btn btn--primary btn--block" [disabled]="!lines().length || selling()" (click)="sell()">
              {{ selling() ? 'Registrando…' : 'Cobrar (F2)' }}
            </button>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .pos { max-width: 1100px; margin: 0 auto; }
    h1 { font-family: var(--font-display); margin: 0; }
    .hint { color: var(--color-muted); font-size: 0.875rem; margin: 0.25rem 0 1rem; }
    .pos__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .search-panel, .sale-panel {
      border: 1px solid var(--color-border); border-radius: 0.875rem; padding: 1rem; background: var(--color-surface);
    }
    .search-panel input {
      width: 100%; margin-bottom: 0.5rem; border: 1px solid var(--color-border);
      border-radius: 0.625rem; padding: 0.75rem; font: inherit;
    }
    .results { list-style: none; padding: 0; margin: 0.75rem 0 0; }
    .results button {
      width: 100%; text-align: left; padding: 0.5rem; border: none; background: var(--color-surface-2);
      border-radius: 0.5rem; margin-bottom: 0.25rem; cursor: pointer;
    }
    .variants { margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip {
      border: 1px solid var(--color-border); background: var(--color-bg); border-radius: 999px;
      padding: 0.4rem 0.75rem; cursor: pointer; font: inherit;
    }
    .line {
      display: grid; grid-template-columns: 1fr auto auto; gap: 0.75rem; align-items: center;
      padding: 0.5rem 0; border-bottom: 1px solid var(--color-border);
    }
    .line p { margin: 0; font-size: 0.8125rem; color: var(--color-muted); }
    .line__qty { display: flex; gap: 0.35rem; align-items: center; }
    .line__qty button { width: 1.75rem; height: 1.75rem; border-radius: 0.375rem; border: 1px solid var(--color-border); }
    .totals { margin-top: 1rem; display: grid; gap: 0.5rem; }
    .totals input { width: 100%; padding: 0.625rem; border: 1px solid var(--color-border); border-radius: 0.5rem; }
    .empty { color: var(--color-muted); }
    @media (max-width: 900px) { .pos__grid { grid-template-columns: 1fr; } }
  `,
})
export class PosSalePageComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApi);
  private readonly posApi = inject(PosApi);
  private readonly notifications = inject(NotificationService);

  protected query = '';
  protected receivedAmount = 0;
  protected readonly searchResults = signal<ProductListItem[]>([]);
  protected readonly variantOptions = signal<ProductVariant[]>([]);
  protected readonly lines = signal<PosLine[]>([]);
  protected readonly selling = signal(false);
  private currentProductName = '';

  ngOnInit(): void {
    this.receivedAmount = 0;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'F2') {
      event.preventDefault();
      void this.sell();
    }
  }

  async search(): Promise<void> {
    if (!this.query.trim()) return;
    const res = await firstValueFrom(
      this.catalogApi.listProducts({ search: this.query.trim() }),
    );
    this.searchResults.set(res.results.slice(0, 8));
    this.variantOptions.set([]);
  }

  async loadProductVariants(product: ProductListItem): Promise<void> {
    const detail = await firstValueFrom(this.catalogApi.getProduct(product.id));
    this.currentProductName = detail.name;
    this.variantOptions.set(detail.variants.filter((v) => v.is_active));
  }

  addLine(variant: ProductVariant): void {
    this.lines.update((items) => {
      const existing = items.find((i) => i.variant.id === variant.id);
      if (existing) {
        return items.map((i) =>
          i.variant.id === variant.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...items,
        {
          variant,
          productName: this.currentProductName,
          quantity: 1,
          unitPrice: variant.effective_price,
        },
      ];
    });
    this.variantOptions.set([]);
  }

  changeQty(variantId: number, delta: number): void {
    this.lines.update((items) =>
      items
        .map((i) =>
          i.variant.id === variantId ? { ...i, quantity: i.quantity + delta } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  lineTotal(line: PosLine): number {
    return parseFloat(line.unitPrice) * line.quantity;
  }

  grandTotal(): number {
    return this.lines().reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  changeAmount(): number {
    return this.receivedAmount - this.grandTotal();
  }

  async sell(): Promise<void> {
    if (!this.lines().length) return;
    const total = this.grandTotal();

    if (this.receivedAmount < total) {
      this.notifications.warn('El monto recibido es insuficiente');
      return;
    }

    this.selling.set(true);
    try {
      await firstValueFrom(
        this.posApi.createSale({
          items: this.lines().map((l) => ({ variant_id: l.variant.id, quantity: l.quantity })),
          payments: [
            {
              method: 'CASH',
              amount: total.toFixed(2),
              received_amount: this.receivedAmount.toFixed(2),
            },
          ],
        }),
      );
      this.notifications.success('Venta registrada');
      this.lines.set([]);
      this.receivedAmount = 0;
      this.query = '';
    } finally {
      this.selling.set(false);
    }
  }
}
