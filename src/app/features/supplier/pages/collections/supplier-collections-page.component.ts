import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import type { Collection } from '../../../../core/models/admin.models';
import { StaffContextService } from '../../../../core/services/staff-context.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-supplier-collections-page',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Mis colecciones</h1>
    <p class="hint">Colecciones activas asociadas a temporadas comerciales</p>
    @if (loading()) { <p>Cargando…</p> }
    @else if (!items().length) {
      <app-empty-state icon="📦" title="Sin colecciones" description="Las colecciones se gestionan con el administrador." />
    } @else {
      @for (c of items(); track c.id) {
        <article class="row">
          <div>
            <strong>{{ c.name }}</strong>
            @if (c.season_name) { <p>{{ c.season_name }}</p> }
          </div>
          <span class="badge">{{ c.is_active ? 'Activa' : 'Inactiva' }}</span>
        </article>
      }
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0; }
    .hint { color: var(--color-muted); margin: 0.25rem 0 1rem; font-size: 0.875rem; }
    .row {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem;
      padding: 0.875rem 1rem; border: 1px solid var(--color-border); border-radius: 0.625rem;
      background: var(--color-surface); margin-bottom: 0.5rem;
    }
    p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--color-muted); }
    .badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 999px; background: var(--color-surface-2); }
  `,
})
export class SupplierCollectionsPageComponent implements OnInit {
  private readonly catalog = inject(CatalogAdminApi);
  private readonly staff = inject(StaffContextService);

  protected readonly loading = signal(true);
  protected readonly items = signal<Collection[]>([]);

  ngOnInit(): void { void this.load(); }

  private async load(): Promise<void> {
    try {
      const params: Record<string, number> = {};
      if (this.staff.isSupplier()) {
        const supplierId = await this.staff.resolveSupplierId();
        if (!supplierId) {
          this.items.set([]);
          return;
        }
        params['supplier'] = supplierId;
      }
      const res = await firstValueFrom(this.catalog.listCollections(params));
      this.items.set(res.results);
    } finally {
      this.loading.set(false);
    }
  }
}
