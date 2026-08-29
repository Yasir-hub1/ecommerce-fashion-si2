import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import { SuppliersApi } from '../../../../core/api/suppliers.api';
import type { Collection, Season, Supplier } from '../../../../core/models/admin.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-admin-collections-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Colecciones</h1>
        <p class="subtitle">Vinculadas a temporada y proveedor. Los productos referencian una colección.</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openCreate()">Nueva colección</button>
      }
    </header>

    <label class="filter">
      Filtrar por temporada
      <select [value]="seasonFilter()" (change)="onSeasonFilter($event)">
        <option value="">Todas</option>
        @for (s of seasons(); track s.id) {
          <option [value]="s.id">{{ s.name }} ({{ s.code }})</option>
        }
      </select>
    </label>

    @if (loading()) { <p>Cargando…</p> }
    @else if (!items().length) {
      <app-empty-state icon="✨" title="Sin colecciones" description="Crea temporadas y proveedores primero." />
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Temporada</th><th>Proveedor</th><th>Lanzamiento</th><th>Estado</th>@if (canManage()) { <th></th> }</tr></thead>
          <tbody>
            @for (c of items(); track c.id) {
              <tr>
                <td>{{ c.name }}</td>
                <td>{{ c.season_name ?? seasonLabel(c.season) }}</td>
                <td>{{ supplierLabel(c.supplier) }}</td>
                <td>{{ c.launch_date ?? '—' }}</td>
                <td>{{ c.is_active ? 'Activa' : 'Inactiva' }}</td>
                @if (canManage()) {
                  <td class="actions">
                    <button type="button" class="btn btn--ghost" (click)="openEdit(c)">Editar</button>
                    <button type="button" class="btn btn--ghost danger" (click)="remove(c)">Eliminar</button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (editorOpen()) {
      <div class="modal-backdrop" (click)="closeEditor()">
        <div class="modal" role="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editingId() ? 'Editar colección' : 'Nueva colección' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label>Nombre <input formControlName="name" /></label>
            <label>Slug <input formControlName="slug" /></label>
            <div class="form-row">
              <label>Temporada
                <select formControlName="season">
                  @for (s of seasons(); track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
              </label>
              <label>Proveedor
                <select formControlName="supplier">
                  <option value="">— Sin proveedor —</option>
                  @for (s of suppliers(); track s.id) {
                    <option [value]="s.id">{{ s.trade_name }}</option>
                  }
                </select>
              </label>
            </div>
            <label>Fecha de lanzamiento <input type="date" formControlName="launch_date" /></label>
            <label class="inline"><input type="checkbox" formControlName="is_active" /> Activa</label>
            <div class="modal-actions">
              <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [ADMIN_CRUD_STYLES, `.filter { display: grid; gap: 0.375rem; font-size: 0.875rem; margin-bottom: 1rem; max-width: 20rem; }`],
})
export class AdminCollectionsPageComponent implements OnInit {
  private readonly catalog = inject(CatalogAdminApi);
  private readonly suppliersApi = inject(SuppliersApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly seasonFilter = signal('');
  protected readonly items = signal<Collection[]>([]);
  protected readonly seasons = signal<Season[]>([]);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('catalog.products.manage'));

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    season: ['', Validators.required],
    supplier: [''],
    launch_date: [''],
    is_active: [true],
  });

  ngOnInit(): void { void this.init(); }

  seasonLabel(id: number): string {
    return this.seasons().find((s) => s.id === id)?.name ?? String(id);
  }

  supplierLabel(id: number | null): string {
    if (!id) return '—';
    return this.suppliers().find((s) => s.id === id)?.trade_name ?? String(id);
  }

  onSeasonFilter(event: Event): void {
    this.seasonFilter.set((event.target as HTMLSelectElement).value);
    void this.loadCollections();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '', slug: '',
      season: String(this.seasons()[0]?.id ?? ''),
      supplier: '', launch_date: '', is_active: true,
    });
    this.editorOpen.set(true);
  }

  openEdit(c: Collection): void {
    this.editingId.set(c.id);
    this.form.patchValue({
      name: c.name, slug: c.slug,
      season: String(c.season),
      supplier: c.supplier ? String(c.supplier) : '',
      launch_date: c.launch_date ?? '',
      is_active: c.is_active,
    });
    this.editorOpen.set(true);
  }

  closeEditor(): void { this.editorOpen.set(false); }

  async save(): Promise<void> {
    if (this.form.invalid || !this.canManage()) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name!,
      slug: raw.slug!,
      season: Number(raw.season),
      supplier: raw.supplier ? Number(raw.supplier) : null,
      launch_date: raw.launch_date || null,
      is_active: raw.is_active ?? true,
    };
    const id = this.editingId();
    try {
      if (id) await firstValueFrom(this.catalog.updateCollection(id, body));
      else await firstValueFrom(this.catalog.createCollection(body));
      this.notifications.success('Colección guardada');
      this.closeEditor();
      await this.loadCollections();
    } catch { this.notifications.error('No se pudo guardar'); }
    finally { this.saving.set(false); }
  }

  async remove(c: Collection): Promise<void> {
    if (!confirm(`¿Eliminar ${c.name}?`)) return;
    try {
      await firstValueFrom(this.catalog.deleteCollection(c.id));
      this.notifications.info('Colección eliminada');
      await this.loadCollections();
    } catch { this.notifications.error('No se pudo eliminar'); }
  }

  private async init(): Promise<void> {
    try {
      const [seasons, suppliers] = await Promise.all([
        firstValueFrom(this.catalog.listSeasons()),
        firstValueFrom(this.suppliersApi.listSuppliers()),
      ]);
      this.seasons.set(seasons.results);
      this.suppliers.set(suppliers.results);
      await this.loadCollections();
    } finally { this.loading.set(false); }
  }

  private async loadCollections(): Promise<void> {
    const filter = this.seasonFilter();
    const params = filter ? { season: filter } : undefined;
    const res = await firstValueFrom(this.catalog.listCollections(params));
    this.items.set(res.results);
  }
}
