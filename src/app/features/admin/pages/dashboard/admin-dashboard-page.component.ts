import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi, OrgApi } from '../../../../core/api/catalog-admin.api';
import { OrdersApi } from '../../../../core/api/cart.api';
import { ReservationsApi } from '../../../../core/api/reservations.api';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Panel administrativo</h1>
    <p class="subtitle">
      {{ roleName() || 'Backoffice' }} · accesos según tus permisos
    </p>

    <div class="stats">
      <article class="stat"><span class="stat__value">{{ stats().products }}</span><span>Productos</span></article>
      <article class="stat"><span class="stat__value">{{ stats().branches }}</span><span>Sucursales</span></article>
      <article class="stat"><span class="stat__value">{{ stats().orders }}</span><span>Órdenes</span></article>
      <article class="stat"><span class="stat__value">{{ stats().reservations }}</span><span>Reservas</span></article>
    </div>

    @if (quickLinks().length) {
      <div class="grid">
        @for (item of quickLinks(); track item.path) {
          <a [routerLink]="item.path" class="tile">{{ item.label }}</a>
        }
      </div>
    } @else {
      <p class="hint">No tienes módulos adicionales asignados. Contacta al administrador.</p>
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0; font-size: 1.75rem; }
    .subtitle { color: var(--color-muted); margin: 0.25rem 0 1.25rem; }
    .hint { color: var(--color-muted); font-size: 0.875rem; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
    .stat {
      padding: 1rem; border-radius: 0.875rem; border: 1px solid var(--color-border);
      background: var(--color-surface); display: grid; gap: 0.25rem;
    }
    .stat__value { font-size: 1.5rem; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; }
    .tile {
      padding: 1rem; border-radius: 0.875rem; border: 1px solid var(--color-border);
      background: var(--color-surface); text-decoration: none; color: inherit; font-weight: 600; text-align: center;
    }
    @media (max-width: 768px) { .stats { grid-template-columns: repeat(2, 1fr); } }
  `,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly orgApi = inject(OrgApi);
  private readonly catalogApi = inject(CatalogAdminApi);
  private readonly ordersApi = inject(OrdersApi);
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly permissions = inject(PermissionService);

  protected readonly stats = signal({ products: 0, branches: 0, orders: 0, reservations: 0 });
  protected readonly roleName = this.permissions.roleName;
  protected readonly quickLinks = computed(() =>
    this.permissions.visibleAdminNav().filter((n) => !n.exact),
  );

  async ngOnInit(): Promise<void> {
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
    }
  }
}
