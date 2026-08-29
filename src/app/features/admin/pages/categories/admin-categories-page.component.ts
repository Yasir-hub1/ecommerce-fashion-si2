import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import type { Category } from '../../../../core/models/api.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-admin-categories-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Categorías</h1>
        <p class="subtitle">Jerarquía de categorías y grupo de tallas (Product → Category → size_group).</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openCreate()">Nueva categoría</button>
      }
    </header>

    @if (loading()) { <p>Cargando…</p> }
    @else if (!items().length) {
      <app-empty-state icon="📂" title="Sin categorías" description="Crea categorías para organizar el catálogo." />
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Slug</th><th>Padre</th><th>Estado</th>@if (canManage()) { <th></th> }</tr></thead>
          <tbody>
            @for (c of items(); track c.id) {
              <tr>
                <td>{{ c.name }}</td>
                <td>{{ c.slug }}</td>
                <td>{{ parentName(c.parent) }}</td>
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
          <h2>{{ editingId() ? 'Editar categoría' : 'Nueva categoría' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label>Nombre <input formControlName="name" /></label>
            <label>Slug <input formControlName="slug" placeholder="camisas" /></label>
            <label>Categoría padre
              <select formControlName="parent">
                <option value="">— Raíz —</option>
                @for (c of items(); track c.id) {
                  @if (c.id !== editingId()) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                }
              </select>
            </label>
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
export class AdminCategoriesPageComponent implements OnInit {
  private readonly catalog = inject(CatalogAdminApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly items = signal<Category[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('catalog.products.manage'));

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    parent: [''],
    is_active: [true],
  });

  ngOnInit(): void { void this.load(); }

  parentName(id: number | null): string {
    if (!id) return '—';
    return this.items().find((c) => c.id === id)?.name ?? String(id);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', slug: '', parent: '', is_active: true });
    this.editorOpen.set(true);
  }

  openEdit(c: Category): void {
    this.editingId.set(c.id);
    this.form.patchValue({ name: c.name, slug: c.slug, parent: c.parent ? String(c.parent) : '', is_active: c.is_active });
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
      parent: raw.parent ? Number(raw.parent) : null,
      is_active: raw.is_active ?? true,
    };
    const id = this.editingId();
    try {
      if (id) await firstValueFrom(this.catalog.updateCategory(id, body));
      else await firstValueFrom(this.catalog.createCategory(body));
      this.notifications.success('Categoría guardada');
      this.closeEditor();
      await this.load();
    } catch { this.notifications.error('No se pudo guardar'); }
    finally { this.saving.set(false); }
  }

  async remove(c: Category): Promise<void> {
    if (!confirm(`¿Eliminar ${c.name}?`)) return;
    try {
      await firstValueFrom(this.catalog.deleteCategory(c.id));
      this.notifications.info('Categoría eliminada');
      await this.load();
    } catch { this.notifications.error('No se pudo eliminar'); }
  }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.catalog.listCategories());
      this.items.set(res.results);
    } finally { this.loading.set(false); }
  }
}
