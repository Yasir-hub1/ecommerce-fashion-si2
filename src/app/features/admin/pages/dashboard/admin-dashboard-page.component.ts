import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi, OrgApi } from '../../../../core/api/catalog-admin.api';
import { OrdersApi } from '../../../../core/api/cart.api';
import { ReservationsApi } from '../../../../core/api/reservations.api';
import { PermissionService } from '../../../../core/services/permission.service';

interface DashStats {
  products: number;
  branches: number;
  orders: number;
  reservations: number;
}

interface BarDatum {
  key: keyof DashStats;
  label: string;
  value: number;
  pct: number;
  color: string;
  path: string;
}

interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  dash: string;
  offset: number;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="hero anim-rise">
      <div>
        <p class="eyebrow">Consola operativa</p>
        <h1 class="page-title">Panel</h1>
        <p class="subtitle">
          {{ roleName() || 'Backoffice' }} · vista según tus permisos
        </p>
      </div>
      @if (!loading()) {
        <p class="hero__pulse" aria-live="polite">
          <span class="hero__pulse-dot" aria-hidden="true"></span>
          {{ totalActivity() }} movimientos activos
        </p>
      }
    </header>

    @if (loading()) {
      <div class="skeleton-grid" aria-busy="true">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="skeleton-card"></div>
        }
      </div>
    } @else {
      <section class="kpis anim-fade" aria-label="Indicadores">
        @for (bar of bars(); track bar.key) {
          <a [routerLink]="bar.path" class="kpi">
            <div class="kpi__top">
              <span class="kpi__label">{{ bar.label }}</span>
              <span class="kpi__ring" [style.--ring-color]="bar.color" [style.--ring-pct]="bar.pct + '%'"></span>
            </div>
            <p class="kpi__value">{{ bar.value }}</p>
            <p class="kpi__hint">{{ bar.pct }}% del volumen total</p>
          </a>
        }
      </section>

      <section class="charts" aria-label="Gráficos">
        <article class="panel">
          <header class="panel__head">
            <h2>Volumen por módulo</h2>
            <p>Comparativa de registros actuales</p>
          </header>
          <div class="bars" role="img" [attr.aria-label]="barsAria()">
            @for (bar of bars(); track bar.key) {
              <div class="bar-row">
                <div class="bar-row__meta">
                  <span>{{ bar.label }}</span>
                  <strong>{{ bar.value }}</strong>
                </div>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    [style.width.%]="bar.pct"
                    [style.background]="bar.color"
                  ></div>
                </div>
              </div>
            }
          </div>
        </article>

        <article class="panel">
          <header class="panel__head">
            <h2>Mix operativo</h2>
            <p>Participación relativa</p>
          </header>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 42 42" aria-hidden="true">
              <circle class="donut__track" cx="21" cy="21" r="15.915" />
              @for (slice of donut(); track slice.key) {
                <circle
                  class="donut__slice"
                  cx="21"
                  cy="21"
                  r="15.915"
                  [attr.stroke]="slice.color"
                  [attr.stroke-dasharray]="slice.dash"
                  [attr.stroke-dashoffset]="slice.offset"
                />
              }
              <text x="21" y="20.2" class="donut__center">{{ totalActivity() }}</text>
              <text x="21" y="24.8" class="donut__center-sub">total</text>
            </svg>
            <ul class="legend">
              @for (slice of donut(); track slice.key) {
                <li>
                  <span class="legend__swatch" [style.background]="slice.color"></span>
                  <span>{{ slice.label }}</span>
                  <strong>{{ slice.value }}</strong>
                </li>
              }
            </ul>
          </div>
        </article>
      </section>
    }

    <section class="shortcuts">
      <header class="panel__head">
        <h2>Accesos rápidos</h2>
        <p>Módulos disponibles para tu rol</p>
      </header>

      @if (quickLinks().length) {
        <div class="shortcut-grid">
          @for (item of quickLinks(); track item.path) {
            <a [routerLink]="item.path" class="shortcut">
              <span class="shortcut__group">{{ item.group ?? 'Módulo' }}</span>
              <span class="shortcut__label">{{ item.label }}</span>
              <span class="shortcut__go" aria-hidden="true">→</span>
            </a>
          }
        </div>
      } @else {
        <p class="hint">No tienes módulos adicionales asignados. Contacta al administrador.</p>
      }
    </section>
  `,
  styles: `
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.35rem;
      padding-bottom: 1.1rem;
      border-bottom: 1px solid var(--color-border);
    }
    .eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--color-accent);
      font-weight: 700;
    }
    .page-title {
      margin: 0;
      font-size: clamp(1.75rem, 3vw, 2.25rem);
      letter-spacing: -0.04em;
    }
    .subtitle { margin: 0.35rem 0 0; }
    .hero__pulse {
      margin: 0;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-teal);
      background: var(--color-teal-soft);
      padding: 0.4rem 0.7rem;
      border-radius: var(--radius-sm);
    }
    .hero__pulse-dot {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 999px;
      background: var(--color-teal);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-teal) 20%, transparent);
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .skeleton-card {
      height: 6.5rem;
      background: linear-gradient(90deg, var(--color-surface-2), var(--color-border), var(--color-surface-2));
      background-size: 200% 100%;
      animation: veta-shimmer 1.2s infinite;
    }

    .kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.1rem;
    }
    .kpi {
      display: grid;
      gap: 0.35rem;
      padding: 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      text-decoration: none;
      color: inherit;
      transition: border-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
    }
    .kpi:hover {
      border-color: var(--color-ink);
      transform: translateY(-2px);
    }
    .kpi__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .kpi__label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-muted);
      font-weight: 700;
    }
    .kpi__ring {
      width: 1.35rem;
      height: 1.35rem;
      border-radius: 999px;
      background:
        radial-gradient(closest-side, var(--color-surface) 62%, transparent 63% 100%),
        conic-gradient(var(--ring-color) var(--ring-pct), var(--color-surface-2) 0);
    }
    .kpi__value {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.85rem;
      font-weight: 750;
      letter-spacing: -0.04em;
      line-height: 1;
    }
    .kpi__hint {
      margin: 0;
      font-size: 0.75rem;
      color: var(--color-muted);
    }

    .charts {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: 0.9rem;
      margin-bottom: 1.25rem;
    }
    .panel {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      padding: 1.1rem 1.15rem 1.2rem;
    }
    .panel__head { margin-bottom: 1rem; }
    .panel__head h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.05rem;
      letter-spacing: -0.02em;
    }
    .panel__head p {
      margin: 0.25rem 0 0;
      color: var(--color-muted);
      font-size: 0.8125rem;
    }

    .bars { display: grid; gap: 0.85rem; }
    .bar-row__meta {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      font-size: 0.8125rem;
      margin-bottom: 0.35rem;
    }
    .bar-row__meta span { color: var(--color-muted); font-weight: 500; }
    .bar-track {
      height: 0.55rem;
      background: var(--color-surface-2);
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      min-width: 0;
      transition: width 0.6s var(--ease-out);
    }

    .donut-wrap {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 1rem;
      align-items: center;
    }
    .donut {
      width: 8.5rem;
      height: 8.5rem;
      transform: rotate(-90deg);
    }
    .donut__track {
      fill: none;
      stroke: var(--color-surface-2);
      stroke-width: 4.5;
    }
    .donut__slice {
      fill: none;
      stroke-width: 4.5;
      stroke-linecap: butt;
      transition: stroke-dasharray 0.5s var(--ease-out);
    }
    .donut__center,
    .donut__center-sub {
      fill: var(--color-text);
      text-anchor: middle;
      transform: rotate(90deg);
      transform-origin: 21px 21px;
    }
    .donut__center {
      font-size: 0.45rem;
      font-weight: 700;
      font-family: var(--font-display);
    }
    .donut__center-sub {
      font-size: 0.22rem;
      fill: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.55rem;
    }
    .legend li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.5rem;
      align-items: center;
      font-size: 0.8125rem;
    }
    .legend__swatch {
      width: 0.55rem;
      height: 0.55rem;
      transform: rotate(45deg);
    }

    .shortcuts {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      padding: 1.1rem 1.15rem 1.2rem;
    }
    .shortcut-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.55rem;
    }
    .shortcut {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: auto auto;
      gap: 0.15rem 0.5rem;
      padding: 0.85rem 0.9rem;
      border: 1px solid var(--color-border);
      text-decoration: none;
      color: inherit;
      background: var(--color-bg);
      transition: border-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
    }
    .shortcut:hover {
      border-color: var(--color-ink);
      transform: translateY(-1px);
    }
    .shortcut__group {
      grid-column: 1;
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-muted);
      font-weight: 700;
    }
    .shortcut__label {
      grid-column: 1;
      font-weight: 650;
      font-size: 0.9375rem;
    }
    .shortcut__go {
      grid-row: 1 / span 2;
      grid-column: 2;
      align-self: center;
      color: var(--color-accent);
      font-weight: 700;
    }
    .hint { color: var(--color-muted); font-size: 0.875rem; margin: 0; }

    @media (max-width: 960px) {
      .charts { grid-template-columns: 1fr; }
      .kpis, .skeleton-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 520px) {
      .donut-wrap { grid-template-columns: 1fr; justify-items: center; }
      .legend { width: 100%; }
    }
  `,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly orgApi = inject(OrgApi);
  private readonly catalogApi = inject(CatalogAdminApi);
  private readonly ordersApi = inject(OrdersApi);
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly permissions = inject(PermissionService);

  private static readonly COLORS = {
    products: '#07111c',
    branches: '#0d7a6f',
    orders: '#ff2d1a',
    reservations: '#5a6b7a',
  } as const;

  protected readonly loading = signal(true);
  protected readonly stats = signal<DashStats>({
    products: 0,
    branches: 0,
    orders: 0,
    reservations: 0,
  });
  protected readonly roleName = this.permissions.roleName;
  protected readonly quickLinks = computed(() =>
    this.permissions.visibleAdminNav().filter((n) => !n.exact),
  );

  protected readonly totalActivity = computed(() => {
    const s = this.stats();
    return s.products + s.branches + s.orders + s.reservations;
  });

  protected readonly bars = computed((): BarDatum[] => {
    const s = this.stats();
    const max = Math.max(s.products, s.branches, s.orders, s.reservations, 1);
    const defs: Array<Omit<BarDatum, 'pct'>> = [
      { key: 'products', label: 'Productos', value: s.products, color: AdminDashboardPageComponent.COLORS.products, path: '/admin/productos' },
      { key: 'orders', label: 'Órdenes', value: s.orders, color: AdminDashboardPageComponent.COLORS.orders, path: '/admin/ordenes' },
      { key: 'reservations', label: 'Reservas', value: s.reservations, color: AdminDashboardPageComponent.COLORS.reservations, path: '/admin/reservas' },
      { key: 'branches', label: 'Sucursales', value: s.branches, color: AdminDashboardPageComponent.COLORS.branches, path: '/admin/sucursales' },
    ];
    return defs.map((d) => ({
      ...d,
      pct: Math.round((d.value / max) * 100),
    }));
  });

  protected readonly donut = computed((): DonutSlice[] => {
    const s = this.stats();
    const parts = [
      { key: 'orders', label: 'Órdenes', value: s.orders, color: AdminDashboardPageComponent.COLORS.orders },
      { key: 'reservations', label: 'Reservas', value: s.reservations, color: AdminDashboardPageComponent.COLORS.reservations },
      { key: 'products', label: 'Productos', value: s.products, color: AdminDashboardPageComponent.COLORS.products },
      { key: 'branches', label: 'Sucursales', value: s.branches, color: AdminDashboardPageComponent.COLORS.branches },
    ];
    const total = parts.reduce((acc, p) => acc + p.value, 0) || 1;
    let cursor = 0;
    return parts.map((p) => {
      const pct = (p.value / total) * 100;
      const slice: DonutSlice = {
        ...p,
        dash: `${pct} ${100 - pct}`,
        offset: -cursor,
      };
      cursor += pct;
      return slice;
    });
  });

  protected barsAria(): string {
    return this.bars()
      .map((b) => `${b.label}: ${b.value}`)
      .join(', ');
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const [products, branches, orders, reservations] = await Promise.all([
        firstValueFrom(this.catalogApi.listProducts({})),
        firstValueFrom(this.orgApi.listBranches()),
        firstValueFrom(this.ordersApi.list()),
        firstValueFrom(this.reservationsApi.list()),
      ]);
      this.stats.set({
        products: products.count,
        branches: branches.count,
        orders: orders.count,
        reservations: reservations.count,
      });
    } catch {
      // keep zeros on error
    } finally {
      this.loading.set(false);
    }
  }
}
