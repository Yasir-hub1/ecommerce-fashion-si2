import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { BitacoraApi, type BitacoraEntry } from '../../../../core/api/bitacora.api';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

const ACTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'CREATE', label: 'Creación' },
  { value: 'UPDATE', label: 'Actualización' },
  { value: 'DELETE', label: 'Eliminación' },
  { value: 'LOGIN', label: 'Inicio de sesión' },
  { value: 'LOGIN_FAILED', label: 'Login fallido' },
  { value: 'REGISTER', label: 'Registro' },
  { value: 'OTHER', label: 'Otra' },
] as const;

const MODULES = [
  { value: '', label: 'Todos los módulos' },
  { value: 'accounts', label: 'Cuentas' },
  { value: 'rbac', label: 'Roles y permisos' },
  { value: 'catalog', label: 'Catálogo' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'reservations', label: 'Reservas' },
  { value: 'orders', label: 'Órdenes' },
  { value: 'pos', label: 'Punto de venta' },
  { value: 'payments', label: 'Pagos' },
  { value: 'branches', label: 'Sucursales' },
  { value: 'suppliers', label: 'Proveedores' },
  { value: 'promotions', label: 'Promociones' },
  { value: 'reports', label: 'Reportes' },
  { value: 'ai', label: 'IA' },
] as const;

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-bitacora-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Bitácora</h1>
        <p class="subtitle">Registro de acciones del sistema por usuario, módulo y fecha.</p>
      </div>
    </header>

    <form class="filters" [formGroup]="filters" (ngSubmit)="applyFilters()">
      <label>
        Buscar
        <input formControlName="search" placeholder="Usuario, descripción o ruta" />
      </label>
      <label>
        Acción
        <select formControlName="action">
          @for (a of actions; track a.value) {
            <option [value]="a.value">{{ a.label }}</option>
          }
        </select>
      </label>
      <label>
        Módulo
        <select formControlName="module">
          @for (m of modules; track m.value) {
            <option [value]="m.value">{{ m.label }}</option>
          }
        </select>
      </label>
      <label>
        Desde
        <input type="date" formControlName="created_from" />
      </label>
      <label>
        Hasta
        <input type="date" formControlName="created_to" />
      </label>
      <div class="filter-actions">
        <button type="submit" class="btn btn--primary">Filtrar</button>
        <button type="button" class="btn btn--ghost" (click)="resetFilters()">Limpiar</button>
      </div>
    </form>

    @if (loading()) {
      <p>Cargando bitácora…</p>
    } @else if (!items().length) {
      <app-empty-state
        icon="🗂️"
        title="Sin registros"
        description="Las altas, ediciones, bajas e inicios de sesión aparecerán aquí."
      />
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Módulo</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            @for (row of items(); track row.id) {
              <tr>
                <td>{{ fmt(row.created_at) }}</td>
                <td>
                  <strong>{{ row.user_full_name || row.user_email || 'Sistema' }}</strong>
                  @if (row.user_email && row.user_full_name) {
                    <div class="muted">{{ row.user_email }}</div>
                  }
                </td>
                <td><span class="badge" [class]="'badge action-' + row.action.toLowerCase()">{{ row.action_display }}</span></td>
                <td>{{ row.module }}</td>
                <td>
                  {{ row.description }}
                  @if (row.path) {
                    <div class="muted">{{ row.method }} {{ row.path }}</div>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pager">
        <span class="muted">{{ rangeLabel() }}</span>
        <div class="actions">
          <button type="button" class="btn btn--ghost" [disabled]="page() <= 1" (click)="goTo(page() - 1)">Anterior</button>
          <button type="button" class="btn btn--ghost" [disabled]="!hasNext()" (click)="goTo(page() + 1)">Siguiente</button>
        </div>
      </div>
    }
  `,
  styles: `
    ${ADMIN_CRUD_STYLES}
    .filters {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 0.9fr 0.9fr auto;
      gap: 0.75rem;
      align-items: end;
      margin-bottom: 1rem;
    }
    .filter-actions { display: flex; gap: 0.375rem; }
    .muted { color: var(--color-muted); font-size: 0.75rem; margin-top: 0.15rem; }
    .pager {
      display: flex; justify-content: space-between; align-items: center;
      gap: 1rem; margin-top: 0.875rem; flex-wrap: wrap;
    }
    .action-create { background: #dcfce7; }
    .action-update { background: #dbeafe; }
    .action-delete { background: #fee2e2; }
    .action-login { background: #ede9fe; }
    .action-login_failed { background: #ffedd5; }
    .action-register { background: #f3e8ff; }
    @media (max-width: 960px) {
      .filters { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 640px) {
      .filters { grid-template-columns: 1fr; }
      .filter-actions { display: grid; grid-template-columns: 1fr 1fr; }
      .filter-actions .btn { width: 100%; }
    }
  `,
})
export class AdminBitacoraPageComponent implements OnInit {
  private readonly api = inject(BitacoraApi);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly actions = ACTIONS;
  protected readonly modules = MODULES;
  protected readonly loading = signal(true);
  protected readonly items = signal<BitacoraEntry[]>([]);
  protected readonly count = signal(0);
  protected readonly page = signal(1);

  protected readonly filters = this.fb.nonNullable.group({
    search: [''],
    action: [''],
    module: [''],
    created_from: [''],
    created_to: [''],
  });

  protected readonly rangeLabel = computed(() => {
    const total = this.count();
    if (!total) return '0 registros';
    const start = (this.page() - 1) * PAGE_SIZE + 1;
    const end = Math.min(this.page() * PAGE_SIZE, total);
    return `${start}–${end} de ${total}`;
  });

  ngOnInit(): void {
    void this.load();
  }

  fmt(value: string): string {
    return format(new Date(value), 'd MMM yyyy HH:mm', { locale: es });
  }

  hasNext(): boolean {
    return this.page() * PAGE_SIZE < this.count();
  }

  applyFilters(): void {
    this.page.set(1);
    void this.load();
  }

  resetFilters(): void {
    this.filters.reset({
      search: '',
      action: '',
      module: '',
      created_from: '',
      created_to: '',
    });
    this.page.set(1);
    void this.load();
  }

  goTo(nextPage: number): void {
    if (nextPage < 1) return;
    this.page.set(nextPage);
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    const raw = this.filters.getRawValue();
    try {
      const res = await firstValueFrom(
        this.api.list({
          page: this.page(),
          page_size: PAGE_SIZE,
          search: raw.search.trim() || undefined,
          action: raw.action || undefined,
          module: raw.module || undefined,
          created_from: raw.created_from ? `${raw.created_from}T00:00:00` : undefined,
          created_to: raw.created_to ? `${raw.created_to}T23:59:59` : undefined,
          ordering: '-created_at',
        }),
      );
      this.items.set(res.results);
      this.count.set(res.count);
    } catch {
      this.notifications.error('No se pudo cargar la bitácora');
      this.items.set([]);
      this.count.set(0);
    } finally {
      this.loading.set(false);
    }
  }
}
