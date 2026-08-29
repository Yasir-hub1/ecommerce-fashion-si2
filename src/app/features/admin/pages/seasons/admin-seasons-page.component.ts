import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import { SEASON_KINDS, type Season } from '../../../../core/models/admin.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-admin-seasons-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Temporadas</h1>
        <p class="subtitle">PV26, OI26, escolar… base para colecciones (Product → Collection → Season).</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openCreate()">Nueva temporada</button>
      }
    </header>

    @if (loading()) { <p>Cargando…</p> }
    @else if (!items().length) {
      <app-empty-state icon="🍂" title="Sin temporadas" description="Define temporadas comerciales antes de crear colecciones." />
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Vigencia</th><th>Estado</th>@if (canManage()) { <th></th> }</tr></thead>
          <tbody>
            @for (s of items(); track s.id) {
              <tr>
                <td><span class="badge">{{ s.code }}</span></td>
                <td>{{ s.name }}</td>
                <td>{{ kindLabel(s.kind) }}</td>
                <td>{{ formatRange(s.starts_on, s.ends_on) }}</td>
                <td>{{ s.is_active ? 'Activa' : 'Inactiva' }}</td>
                @if (canManage()) {
                  <td class="actions">
                    <button type="button" class="btn btn--ghost" (click)="openEdit(s)">Editar</button>
                    <button type="button" class="btn btn--ghost danger" (click)="remove(s)">Eliminar</button>
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
          <h2>{{ editingId() ? 'Editar temporada' : 'Nueva temporada' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-row">
              <label>Código <input formControlName="code" placeholder="PV26" /></label>
              <label>Tipo
                <select formControlName="kind">
                  @for (k of kinds; track k.value) {
                    <option [value]="k.value">{{ k.label }}</option>
                  }
                </select>
              </label>
            </div>
            <label>Nombre <input formControlName="name" /></label>
            <div class="form-row">
              <label>Inicio <input type="date" formControlName="starts_on" /></label>
              <label>Fin <input type="date" formControlName="ends_on" /></label>
            </div>
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
  styles: ADMIN_CRUD_STYLES,
})
export class AdminSeasonsPageComponent implements OnInit {
  private readonly catalog = inject(CatalogAdminApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly kinds = SEASON_KINDS;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly items = signal<Season[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('catalog.products.manage'));

  protected readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    kind: ['SPRING_SUMMER', Validators.required],
    starts_on: ['', Validators.required],
    ends_on: ['', Validators.required],
    is_active: [true],
  });

  ngOnInit(): void { void this.load(); }

  kindLabel(kind: string): string {
    return this.kinds.find((k) => k.value === kind)?.label ?? kind;
  }

  formatRange(from: string, to: string): string {
    return `${format(new Date(from), 'd MMM yyyy', { locale: es })} – ${format(new Date(to), 'd MMM yyyy', { locale: es })}`;
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ code: '', name: '', kind: 'SPRING_SUMMER', starts_on: '', ends_on: '', is_active: true });
    this.editorOpen.set(true);
  }

  openEdit(s: Season): void {
    this.editingId.set(s.id);
    this.form.patchValue({
      code: s.code, name: s.name, kind: s.kind,
      starts_on: s.starts_on, ends_on: s.ends_on, is_active: s.is_active,
    });
    this.editorOpen.set(true);
  }

  closeEditor(): void { this.editorOpen.set(false); }

  async save(): Promise<void> {
    if (this.form.invalid || !this.canManage()) return;
    this.saving.set(true);
    const body = this.form.getRawValue();
    const id = this.editingId();
    try {
      if (id) await firstValueFrom(this.catalog.updateSeason(id, body));
      else await firstValueFrom(this.catalog.createSeason(body));
      this.notifications.success('Temporada guardada');
      this.closeEditor();
      await this.load();
    } catch { this.notifications.error('No se pudo guardar'); }
    finally { this.saving.set(false); }
  }

  async remove(s: Season): Promise<void> {
    if (!confirm(`¿Eliminar ${s.name}?`)) return;
    try {
      await firstValueFrom(this.catalog.deleteSeason(s.id));
      this.notifications.info('Temporada eliminada');
      await this.load();
    } catch { this.notifications.error('No se pudo eliminar'); }
  }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.catalog.listSeasons());
      this.items.set(res.results);
    } finally { this.loading.set(false); }
  }
}
