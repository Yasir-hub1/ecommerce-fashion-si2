import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { openPosReceiptPdf, PosApi } from '../../../../core/api/pos.api';
import type { PosDailySummary, PosSaleListItem } from '../../../../core/models/pos.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PosBranchService } from '../../../../core/services/pos-branch.service';
import { PosSubnavComponent } from '../../components/pos-subnav/pos-subnav.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD_POS: 'Tarjeta POS',
  QR: 'QR',
  TRANSFER: 'Transferencia',
};

@Component({
  selector: 'app-pos-sales-today-page',
  standalone: true,
  imports: [EmptyStateComponent, PricePipe, PosSubnavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pos-subnav />
    <h1 class="page-title">Ventas del día</h1>

    @if (loading()) {
      <p class="muted">Cargando resumen…</p>
    } @else if (summary(); as s) {
      <section class="summary">
        <div class="summary__card">
          <span class="label">Ventas</span>
          <strong>{{ s.order_count }}</strong>
        </div>
        <div class="summary__card summary__card--accent">
          <span class="label">Total</span>
          <strong>{{ s.total_sales | price }}</strong>
        </div>
        <div class="summary__card">
          <span class="label">Cajero</span>
          <strong>{{ s.cashier_name }}</strong>
        </div>
        <div class="summary__card">
          <span class="label">Sucursal</span>
          <strong>{{ s.branch_code }}</strong>
        </div>
      </section>

      @if (paymentBreakdown(s).length) {
        <section class="methods">
          <h2>Por método de pago</h2>
          @for (row of paymentBreakdown(s); track row.method) {
            <div class="method-row">
              <span>{{ row.label }}</span>
              <span>{{ row.count }} ops · {{ row.total | price }}</span>
            </div>
          }
        </section>
      }
    }

    <h2 class="section-title">Detalle</h2>
    @if (!sales().length && !loading()) {
      <app-empty-state icon="🧾" title="Sin ventas hoy" description="Las ventas POS registradas hoy aparecerán aquí." />
    } @else {
      @for (sale of sales(); track sale.id) {
        <article class="row">
          <div>
            <strong>{{ sale.code }}</strong>
            <p>{{ fmt(sale.paid_at ?? sale.created_at) }} · {{ sale.status_display }}</p>
            @if (sale.customer_name) {
              <p class="customer">{{ sale.customer_name }}</p>
            }
          </div>
          <div class="row__actions">
            <span>{{ sale.grand_total | price }}</span>
            <button type="button" class="btn btn--ghost btn--sm" (click)="printReceipt(sale.id)">PDF</button>
          </div>
        </article>
      }
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0 0 1rem; }
    .section-title { font-size: 1rem; margin: 1.5rem 0 0.75rem; font-family: var(--font-display); }
    .muted { color: var(--color-muted); }
    .summary {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;
    }
    .summary__card {
      border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 0.875rem 1rem;
      background: var(--color-surface); display: flex; flex-direction: column; gap: 0.25rem;
    }
    .summary__card--accent strong { color: var(--color-accent); font-size: 1.25rem; }
    .label { font-size: 0.75rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .methods { margin-bottom: 0.5rem; }
    .methods h2 { font-size: 0.9375rem; margin: 0 0 0.5rem; }
    .method-row {
      display: flex; justify-content: space-between; padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border); font-size: 0.875rem;
    }
    .row {
      display: flex; justify-content: space-between; gap: 1rem; align-items: center;
      padding: 0.875rem 1rem; border: 1px solid var(--color-border); border-radius: 0.625rem;
      background: var(--color-surface); margin-bottom: 0.5rem;
    }
    .row p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--color-muted); }
    .customer { font-style: italic; }
    .row__actions { display: flex; align-items: center; gap: 0.75rem; }
    .btn--sm { font-size: 0.8125rem; padding: 0.25rem 0.625rem; }
  `,
})
export class PosSalesTodayPageComponent implements OnInit {
  private readonly posApi = inject(PosApi);
  private readonly posBranch = inject(PosBranchService);

  protected readonly loading = signal(true);
  protected readonly summary = signal<PosDailySummary | null>(null);
  protected readonly sales = signal<PosSaleListItem[]>([]);

  ngOnInit(): void {
    void this.posBranch.ensureReady().then(() => this.load());
  }

  protected fmt(v: string): string {
    return format(new Date(v), 'HH:mm', { locale: es });
  }

  protected paymentBreakdown(s: PosDailySummary): { method: string; label: string; total: string; count: number }[] {
    return Object.entries(s.by_payment_method ?? {}).map(([method, data]) => ({
      method,
      label: PAYMENT_LABELS[method] ?? method,
      total: data.total,
      count: data.count,
    }));
  }

  protected printReceipt(orderId: number): void {
    openPosReceiptPdf(this.posApi, orderId);
  }

  private async load(): Promise<void> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const branchId = this.posBranch.effectiveBranchId() ?? undefined;
    try {
      const [summary, salesRes] = await Promise.all([
        firstValueFrom(this.posApi.dailySummary(today, branchId)),
        firstValueFrom(this.posApi.listSales({ paid_at__date: today, branch_id: branchId ?? '' })),
      ]);
      this.summary.set(summary);
      this.sales.set(salesRes.results);
    } finally {
      this.loading.set(false);
    }
  }
}
