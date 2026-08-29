import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AdminApi } from '../../../../core/api/admin.api';
import { CatalogApi } from '../../../../core/api/auth.api';

@Component({
  selector: 'app-supplier-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Portal del proveedor</h1>
    <p class="subtitle">Consulta colecciones y productos asociados a tus temporadas</p>

    <div class="stats">
      <article class="stat"><span class="stat__value">{{ collections() }}</span><span>Colecciones</span></article>
      <article class="stat"><span class="stat__value">{{ products() }}</span><span>Productos</span></article>
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
export class SupplierDashboardPageComponent implements OnInit {
  private readonly adminApi = inject(AdminApi);
  private readonly catalogApi = inject(CatalogApi);

  protected readonly collections = signal(0);
  protected readonly products = signal(0);
  protected readonly links = [
    { label: 'Colecciones', path: '/admin/colecciones' },
    { label: 'Productos', path: '/admin/productos' },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const [c, p] = await Promise.all([
        firstValueFrom(this.adminApi.listCollections()),
        firstValueFrom(this.catalogApi.listProducts({})),
      ]);
      this.collections.set(c.count);
      this.products.set(p.count);
    } catch { /* ignore */ }
  }
}
