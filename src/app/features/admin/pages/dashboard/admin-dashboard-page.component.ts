import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { OrgApi } from '../../../../core/api/catalog-admin.api';
import { environment } from '../../../../../environments/environment';
import type { DashboardPayload } from '../../../../core/api/reports.api';
import type { Branch } from '../../../../core/models/api.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

const PERIODS = [
  { days: 7, label: '7 días' },
  { days: 14, label: '14 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
] as const;

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [RouterLink, PricePipe, DecimalPipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ roleName() || 'Backoffice' }}</p>
        <h1 class="page-title">Panel estadístico</h1>
        <p class="subtitle">{{ periodLabel() }} · comparado con el periodo anterior</p>
      </div>
      <div class="toolbar">
        @if (canFilterBranch()) {
          <label class="branch-filter">
            Sucursal
            <select [value]="branchId()" (change)="onBranchChange($event)">
              <option value="">Todas</option>
              @for (b of branches(); track b.id) {
                <option [value]="b.id">{{ b.name }}</option>
              }
            </select>
          </label>
        }
        <div class="periods" role="radiogroup" aria-label="Periodo">
          @for (p of periods; track p.days) {
            <button
              type="button"
              class="chip"
              role="radio"
              [class.active]="days() === p.days"
              [attr.aria-checked]="days() === p.days"
              (click)="days.set(p.days)"
            >{{ p.label }}</button>
          }
        </div>
      </div>
    </header>

    @if (dashboard.error()) {
      <app-empty-state
        icon="📊"
        title="No se pudieron cargar las estadísticas"
        description="Revisa la sesión o vuelve a intentar. El panel usa /reports/dashboard/."
      >
        <button type="button" class="btn btn--primary" (click)="dashboard.reload()">Reintentar</button>
      </app-empty-state>
    } @else if (!dashboard.hasValue()) {
      <p>Cargando indicadores…</p>
    } @else if (data(); as dash) {
      <section class="kpis" aria-label="Indicadores">
        <article class="kpi kpi--lead">
          <span class="kpi__label">Ventas</span>
          <strong class="kpi__value">{{ dash.kpis.total_sales | price }}</strong>
          <span class="delta" [class.up]="dash.kpis.total_sales_delta > 0" [class.down]="dash.kpis.total_sales_delta < 0">
            {{ formatDelta(dash.kpis.total_sales_delta) }} vs periodo previo
          </span>
        </article>
        <article class="kpi">
          <span class="kpi__label">Órdenes pagadas</span>
          <strong class="kpi__value">{{ dash.kpis.order_count }}</strong>
          <span class="delta" [class.up]="dash.kpis.order_count_delta > 0" [class.down]="dash.kpis.order_count_delta < 0">
            {{ formatDelta(dash.kpis.order_count_delta) }}
          </span>
        </article>
        <article class="kpi">
          <span class="kpi__label">Reservas</span>
          <strong class="kpi__value">{{ dash.kpis.reservation_count }}</strong>
          <span class="delta" [class.up]="dash.kpis.reservation_count_delta > 0" [class.down]="dash.kpis.reservation_count_delta < 0">
            {{ formatDelta(dash.kpis.reservation_count_delta) }}
          </span>
        </article>
        <article class="kpi">
          <span class="kpi__label">Conversión a venta</span>
          <strong class="kpi__value">{{ dash.kpis.conversion_rate | number:'1.0-1' }}%</strong>
          <span class="delta" [class.up]="dash.kpis.conversion_rate_delta > 0" [class.down]="dash.kpis.conversion_rate_delta < 0">
            {{ formatDelta(dash.kpis.conversion_rate_delta) }}
          </span>
        </article>
        <article class="kpi">
          <span class="kpi__label">Stock bajo</span>
          <strong class="kpi__value">{{ dash.kpis.low_stock_count }}</strong>
          <a routerLink="/admin/inventario" class="kpi__link">Ver inventario</a>
        </article>
        <article class="kpi">
          <span class="kpi__label">Unidades en piso</span>
          <strong class="kpi__value">{{ dash.kpis.units_on_hand }}</strong>
          <span class="muted">{{ dash.kpis.units_reserved }} reservadas · {{ dash.kpis.catalog_products }} productos</span>
        </article>
      </section>

      <section class="card strip-card" [attr.aria-label]="'Ventas diarias, ' + dash.period.label">
        <div class="card__head">
          <h2>Ventas por día</h2>
          <span class="muted">{{ dash.period.from }} → {{ dash.period.to }}</span>
        </div>
        @if (dayBars().length) {
          <div class="strip" role="img" [attr.aria-label]="'Serie de ' + dayBars().length + ' días'">
            @for (d of dayBars(); track d.date) {
              <div class="strip__col" [title]="d.date + ' · ' + d.count + ' órdenes'">
                <div class="strip__bar" [style.height.%]="d.height"></div>
                <span class="strip__label">{{ d.label }}</span>
              </div>
            }
          </div>
        }
      </section>

      <div class="split">
        <section class="card">
          <h2>Por canal</h2>
          @if (!channelBars().length) {
            <p class="muted">Sin ventas pagadas en este periodo.</p>
          } @else {
            <ul class="bars">
              @for (c of channelBars(); track c.channel) {
                <li>
                  <div class="bars__meta">
                    <span>{{ c.label }}</span>
                    <strong>{{ c.total | price }}</strong>
                  </div>
                  <div class="bars__track" aria-hidden="true">
                    <span class="bars__fill" [style.width.%]="c.width"></span>
                  </div>
                  <span class="muted">{{ c.count }} órdenes</span>
                </li>
              }
            </ul>
          }
        </section>

        <section class="card">
          <h2>Reservas por estado</h2>
          @if (!dash.reservations_by_status.length) {
            <p class="muted">No hay reservas en el periodo.</p>
          } @else {
            <ul class="status-list">
              @for (s of dash.reservations_by_status; track s.status) {
                <li>
                  <span>{{ s.label }}</span>
                  <strong>{{ s.count }}</strong>
                </li>
              }
            </ul>
          }
        </section>
      </div>

      @if (dash.sales_by_branch.length > 1) {
        <section class="card">
          <h2>Ventas por sucursal</h2>
          <ul class="bars">
            @for (b of branchBars(); track b.branch_id) {
              <li>
                <div class="bars__meta">
                  <span>{{ b.branch_name }}</span>
                  <strong>{{ b.total | price }}</strong>
                </div>
                <div class="bars__track" aria-hidden="true">
                  <span class="bars__fill" [style.width.%]="b.width"></span>
                </div>
              </li>
            }
          </ul>
        </section>
      }

      <div class="split">
        <section class="card">
          <div class="card__head">
            <h2>Top productos</h2>
            <a routerLink="/admin/productos">Catálogo</a>
          </div>
          @if (!dash.top_products.length) {
            <p class="muted">Aún no hay unidades vendidas en el periodo.</p>
          } @else {
            <table>
              <thead><tr><th>Producto</th><th>Ud.</th><th>Ingresos</th></tr></thead>
              <tbody>
                @for (p of dash.top_products; track p.product_name) {
                  <tr>
                    <td>{{ p.product_name }}</td>
                    <td>{{ p.units_sold }}</td>
                    <td>{{ p.revenue | price }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>

        <section class="card">
          <div class="card__head">
            <h2>Alertas de stock</h2>
            <a routerLink="/admin/inventario">Inventario</a>
          </div>
          @if (!dash.low_stock_items.length) {
            <p class="muted">Ningún SKU bajo el umbral.</p>
          } @else {
            <ul class="alerts">
              @for (item of dash.low_stock_items; track item.sku + item.branch_code) {
                <li>
                  <strong>{{ item.product_name }}</strong>
                  <span class="muted">{{ item.branch_code }} · {{ item.sku }} · {{ item.on_hand }}/{{ item.min_threshold }}</span>
                </li>
              }
            </ul>
          }
        </section>
      </div>

      <section class="card">
        <div class="card__head">
          <h2>Últimas órdenes</h2>
          <a routerLink="/admin/ordenes">Ver todas</a>
        </div>
        @if (!dash.recent_orders.length) {
          <p class="muted">No hay órdenes pagadas en este periodo.</p>
        } @else {
          <table>
            <thead><tr><th>Código</th><th>Sucursal</th><th>Canal</th><th>Total</th><th>Pago</th></tr></thead>
            <tbody>
              @for (o of dash.recent_orders; track o.id) {
                <tr>
                  <td>{{ o.code }}</td>
                  <td>{{ o.branch_name }}</td>
                  <td>{{ o.channel_display }}</td>
                  <td>{{ o.grand_total | price }}</td>
                  <td>{{ fmtDate(o.paid_at) }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    }

    @if (quickLinks().length) {
      <nav class="quick" aria-label="Accesos del backoffice">
        @for (item of quickLinks(); track item.path) {
          <a [routerLink]="item.path" class="tile">{{ item.label }}</a>
        }
      </nav>
    }
  `,
  styles: `
    .page-header { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
    .eyebrow { margin: 0; font-size: 0.6875rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-muted); }
    .page-title { font-family: var(--font-display); margin: 0.15rem 0 0; font-size: 1.85rem; }
    .subtitle { color: var(--color-muted); margin: 0.25rem 0 0; font-size: 0.875rem; }
    .toolbar { display: flex; gap: 0.75rem; align-items: end; flex-wrap: wrap; }
    .branch-filter { display: grid; gap: 0.3rem; font-size: 0.75rem; font-weight: 600; color: var(--color-muted); }
    .branch-filter select {
      border: 1px solid var(--color-border); border-radius: 0.625rem;
      padding: 0.45rem 0.7rem; font: inherit; background: var(--color-surface);
    }
    .periods { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .chip {
      border: 1px solid var(--color-border); background: var(--color-surface);
      border-radius: 999px; padding: 0.4rem 0.8rem; cursor: pointer; font: inherit; font-size: 0.8125rem;
    }
    .chip.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
    .kpi {
      padding: 1rem 1.1rem; border-radius: 0.9rem; border: 1px solid var(--color-border);
      background: var(--color-surface); display: grid; gap: 0.2rem;
    }
    .kpi--lead { grid-column: span 1; background: color-mix(in srgb, var(--color-accent) 8%, white); }
    .kpi__label { font-size: 0.75rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .kpi__value { font-family: var(--font-display); font-size: 1.65rem; line-height: 1.1; }
    .kpi__link { font-size: 0.75rem; color: var(--color-accent); text-decoration: none; }
    .delta { font-size: 0.75rem; color: var(--color-muted); }
    .delta.up { color: #166534; }
    .delta.down { color: #b91c1c; }
    .muted { color: var(--color-muted); font-size: 0.8125rem; }
    .card {
      border: 1px solid var(--color-border); border-radius: 0.9rem;
      background: var(--color-surface); padding: 1rem 1.1rem; margin-bottom: 0.75rem;
    }
    .card h2 { margin: 0 0 0.75rem; font-size: 1rem; }
    .card__head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; margin-bottom: 0.5rem; }
    .card__head h2 { margin: 0; }
    .card__head a { font-size: 0.8125rem; color: var(--color-accent); text-decoration: none; }
    .strip { display: flex; align-items: end; gap: 0.28rem; height: 9rem; }
    .strip__col { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: end; }
    .strip__bar {
      width: 100%; max-width: 1.1rem; border-radius: 0.3rem 0.3rem 0 0;
      background: var(--color-accent); min-height: 2px;
    }
    .strip__label { font-size: 0.6rem; color: var(--color-muted); margin-top: 0.35rem; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.7rem; }
    .bars__meta { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.875rem; }
    .bars__track { height: 0.4rem; background: var(--color-surface-2); border-radius: 999px; overflow: hidden; margin: 0.25rem 0; }
    .bars__fill { display: block; height: 100%; background: var(--color-accent); }
    .status-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
    .status-list li { display: flex; justify-content: space-between; padding: 0.45rem 0; border-bottom: 1px solid var(--color-border); }
    .alerts { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.55rem; }
    .alerts li { display: grid; gap: 0.1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; min-width: 28rem; }
    th, td { padding: 0.45rem 0.35rem; text-align: left; border-bottom: 1px solid var(--color-border); }
    th { color: var(--color-muted); font-weight: 600; font-size: 0.75rem; }
    .card { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .quick { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.6rem; margin-top: 0.5rem; }
    .tile {
      padding: 0.85rem; border-radius: 0.75rem; border: 1px solid var(--color-border);
      background: var(--color-surface); text-decoration: none; font-weight: 600; text-align: center; font-size: 0.8125rem;
      min-height: 2.75rem; display: grid; place-items: center;
    }
    @media (max-width: 900px) {
      .kpis, .split { grid-template-columns: 1fr 1fr; }
      .page-title { font-size: 1.5rem; }
      .strip { height: 7rem; }
    }
    @media (max-width: 640px) {
      .kpis, .split { grid-template-columns: 1fr; }
      .kpi--lead { grid-column: auto; }
      .kpi__value { font-size: 1.4rem; }
      .toolbar { width: 100%; }
      .branch-filter { width: 100%; }
      .branch-filter select { width: 100%; }
      .periods { width: 100%; }
      .chip { flex: 1 1 auto; text-align: center; }
    }
  `,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly orgApi = inject(OrgApi);
  private readonly permissions = inject(PermissionService);

  protected readonly periods = PERIODS;
  protected readonly days = signal(30);
  protected readonly branchId = signal('');
  protected readonly branches = signal<Branch[]>([]);
  protected readonly roleName = this.permissions.roleName;
  protected readonly canFilterBranch = computed(() => this.permissions.role() === 'ADMIN');
  protected readonly quickLinks = computed(() =>
    this.permissions.visibleAdminNav().filter((item) => !item.exact),
  );

  protected readonly dashboard = httpResource<DashboardPayload>(() => ({
    url: `${environment.apiUrl}/reports/dashboard/`,
    params: {
      days: String(this.days()),
      ...(this.branchId() ? { branch_id: this.branchId() } : {}),
    },
  }));

  protected readonly data = computed(() => (this.dashboard.hasValue() ? this.dashboard.value() : null));
  protected readonly periodLabel = computed(() => this.data()?.period.label ?? 'Operación de tienda');

  protected readonly dayBars = computed(() => {
    const series = this.data()?.sales_by_day ?? [];
    const max = Math.max(...series.map((row) => Number(row.total)), 0);
    return series.map((row, index) => ({
      ...row,
      height: max > 0 ? Math.max(6, (Number(row.total) / max) * 100) : 0,
      label: this.tickLabel(row.date, index, series.length),
    }));
  });

  protected readonly channelBars = computed(() => {
    const rows = this.data()?.sales_by_channel ?? [];
    const max = Math.max(...rows.map((row) => Number(row.total)), 0);
    return rows.map((row) => ({
      ...row,
      width: max > 0 ? (Number(row.total) / max) * 100 : 0,
    }));
  });

  protected readonly branchBars = computed(() => {
    const rows = this.data()?.sales_by_branch ?? [];
    const max = Math.max(...rows.map((row) => Number(row.total)), 0);
    return rows.map((row) => ({
      ...row,
      width: max > 0 ? (Number(row.total) / max) * 100 : 0,
    }));
  });

  ngOnInit(): void {
    if (this.canFilterBranch()) void this.loadBranches();
  }

  onBranchChange(event: Event): void {
    this.branchId.set((event.target as HTMLSelectElement).value);
  }

  formatDelta(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  fmtDate(value: string): string {
    if (!value) return '—';
    return format(new Date(value), 'd MMM HH:mm', { locale: es });
  }

  private tickLabel(isoDate: string, index: number, total: number): string {
    const step = total > 14 ? Math.ceil(total / 7) : 1;
    if (index % step !== 0 && index !== total - 1) return '';
    return format(new Date(`${isoDate}T12:00:00`), 'd MMM', { locale: es });
  }

  private async loadBranches(): Promise<void> {
    try {
      const res = await firstValueFrom(this.orgApi.listBranches({ is_active: true, page_size: 50 }));
      this.branches.set(res.results);
    } catch {
      this.branches.set([]);
    }
  }
}
