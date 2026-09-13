import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import type { Collection } from '../../../../core/models/admin.models';
import { StaffContextService } from '../../../../core/services/staff-context.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LIST_ROW_STYLES } from '../../../../shared/styles/admin-crud.styles';

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
  styles: LIST_ROW_STYLES,
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
