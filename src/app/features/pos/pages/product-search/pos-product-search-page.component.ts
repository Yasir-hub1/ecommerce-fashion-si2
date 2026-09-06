import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PosApi } from '../../../../core/api/pos.api';
import type { PosSearchResult } from '../../../../core/models/pos.models';
import { PosBranchService } from '../../../../core/services/pos-branch.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PosSubnavComponent } from '../../components/pos-subnav/pos-subnav.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-pos-product-search-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PricePipe, PosSubnavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pos-subnav />
    <h1 class="page-title">Buscar producto</h1>
    <p class="hint">Consulta stock en tu sucursal por nombre, SKU o código de barras.</p>
    <div class="search">
      <input
        type="text"
        placeholder="Nombre, SKU o código…"
        [(ngModel)]="query"
        (keydown.enter)="search()"
        [disabled]="loading()"
      />
      <button type="button" class="btn btn--primary" [disabled]="loading()" (click)="search()">
        {{ loading() ? 'Buscando…' : 'Buscar' }}
      </button>
    </div>

    @if (searched() && !results().length) {
      <p class="empty">Sin resultados para «{{ lastQuery() }}»</p>
    }

    @for (item of results(); track item.variant_id) {
      <article class="result">
        <div>
          <strong>{{ item.product_name }}</strong>
          <p>{{ item.sku }} · {{ item.size }} · {{ item.color }}</p>
          @if (item.barcode) {
            <p class="barcode">Barcode: {{ item.barcode }}</p>
          }
        </div>
        <div class="result__meta">
          <span class="price">{{ item.unit_price | price }}</span>
          <span class="stock" [class.stock--low]="item.stock.available <= 2">
            Stock: {{ item.stock.available }}
          </span>
          <a routerLink="/admin/pos" class="link">Ir a caja →</a>
        </div>
      </article>
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0 0 0.25rem; }
    .hint { color: var(--color-muted); font-size: 0.875rem; margin: 0 0 1rem; }
    .search { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    input { flex: 1; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.625rem; font: inherit; }
    .result {
      display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start;
      padding: 0.875rem 1rem; margin-bottom: 0.5rem;
      border: 1px solid var(--color-border); border-radius: 0.625rem; background: var(--color-surface);
    }
    .result p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--color-muted); }
    .barcode { font-family: monospace; }
    .result__meta { text-align: right; display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-end; }
    .price { font-weight: 600; }
    .stock { font-size: 0.8125rem; color: #047857; }
    .stock--low { color: #b45309; }
    .link { font-size: 0.8125rem; color: var(--color-accent); text-decoration: none; }
    .empty { color: var(--color-muted); }
  `,
})
export class PosProductSearchPageComponent implements OnInit {
  private readonly posApi = inject(PosApi);
  private readonly posBranch = inject(PosBranchService);
  private readonly notifications = inject(NotificationService);

  ngOnInit(): void {
    void this.posBranch.ensureReady();
  }

  protected query = '';
  protected readonly results = signal<PosSearchResult[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly lastQuery = signal('');

  async search(): Promise<void> {
    const q = this.query.trim();
    if (!q) return;

    this.loading.set(true);
    this.lastQuery.set(q);
    try {
      const res = await firstValueFrom(this.posApi.search(q, 24, this.posBranch.effectiveBranchId() ?? undefined));
      this.results.set(res.results);
      this.searched.set(true);
    } catch {
      this.notifications.error('Error al buscar');
      this.results.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
