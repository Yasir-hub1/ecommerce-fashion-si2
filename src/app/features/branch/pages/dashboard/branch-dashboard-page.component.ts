import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { OrdersApi } from '../../../../core/api/cart.api';
import { ReservationsApi } from '../../../../core/api/reservations.api';

@Component({
  selector: 'app-branch-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Panel de sucursal</h1>
    <p class="subtitle">Reservas, ventas e inventario de tu tienda</p>

    <div class="stats">
      <article class="stat"><span class="stat__value">{{ upcoming() }}</span><span>Reservas próximas</span></article>
      <article class="stat"><span class="stat__value">{{ sales() }}</span><span>Ventas recientes</span></article>
    </div>

    <div class="grid">
      @for (item of links; track item.path) {
        <a [routerLink]="item.path" class="tile">{{ item.label }}</a>
      }
    </div>
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0; }
    .subtitle { color: var(--color-muted); margin: 0.25rem 0 1rem; }
    .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
    .stat { padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.875rem; background: var(--color-surface); display: grid; }
    .stat__value { font-size: 1.5rem; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; }
    .tile {
      padding: 1rem; border-radius: 0.875rem; border: 1px solid var(--color-border);
      background: var(--color-surface); text-decoration: none; color: inherit; font-weight: 600; text-align: center;
    }
  `,
})
export class BranchDashboardPageComponent implements OnInit {
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly ordersApi = inject(OrdersApi);

  protected readonly upcoming = signal(0);
  protected readonly sales = signal(0);
  protected readonly links = [
    { label: 'Reservas', path: '/admin/reservas' },
    { label: 'Inventario', path: '/admin/inventario' },
    { label: 'Órdenes', path: '/admin/ordenes' },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const [upcoming, orders] = await Promise.all([
        firstValueFrom(this.reservationsApi.upcoming()),
        firstValueFrom(this.ordersApi.list()),
      ]);
      this.upcoming.set(upcoming.count);
      this.sales.set(orders.count);
    } catch { /* ignore */ }
  }
}
