import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import type { Color, Size, SizeGroup } from '../../../../core/models/admin.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

type Tab = 'colors' | 'sizes' | 'groups';

@Component({
  selector: 'app-admin-attributes-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Tallas y colores</h1>
        <p class="subtitle">Atributos de variantes: SKU = producto × talla × color.</p>
      </div>
      @if (canManage() && tab() !== 'sizes') {
        <button type="button" class="btn btn--primary" (click)="openCreate()">
          {{ tab() === 'colors' ? 'Nuevo color' : 'Nuevo grupo' }}
        </button>
      }
      @if (canManage() && tab() === 'sizes') {
        <button type="button" class="btn btn--primary" (click)="openSizeCreate()">Nueva talla</button>
      }
    </header>

    <div class="tabs">
      <button type="button" class="tab" [class.active]="tab() === 'colors'" (click)="tab.set('colors')">Colores</button>
      <button type="button" class="tab" [class.active]="tab() === 'sizes'" (click)="tab.set('sizes')">Tallas</button>
      <button type="button" class="tab" [class.active]="tab() === 'groups'" (click)="tab.set('groups')">Grupos</button>
    </div>

    @if (tab() === 'colors') {
      <div class="chips">
        @for (c of colors(); track c.id) {
          <span class="chip">
            <span class="swatch" [style.background]="c.hex_code"></span>
            {{ c.name }}
            @if (canManage()) {
              <button type="button" class="chip-btn" (click)="editColor(c)">✎</button>
              <button type="button" class="chip-btn danger" (click)="removeColor(c)">×</button>
            }
          </span>
        }
      </div>
    } @else if (tab() === 'sizes') {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Grupo</th><th>Código</th><th>Orden</th>@if (canManage()) { <th></th> }</tr></thead>
          <tbody>
            @for (s of sizes(); track s.id) {
              <tr>
                <td>{{ s.group_name }}</td><td>{{ s.code }}</td><td>{{ s.display_order }}</td>
                @if (canManage()) {
                  <td class="actions">
                    <button type="button" class="btn btn--ghost" (click)="editSize(s)">Editar</button>
                    <button type="button" class="btn btn--ghost danger" (click)="removeSize(s)">Eliminar</button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Grupo</th><th>Descripción</th>@if (canManage()) { <th></th> }</tr></thead>
          <tbody>
            @for (g of groups(); track g.id) {
              <tr>
                <td>{{ g.name }}</td>
                <td>{{ g.description || '—' }}</td>
                @if (canManage()) {
                  <td class="actions">
                    <button type="button" class="btn btn--ghost danger" (click)="removeGroup(g)">Eliminar</button>
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
          @if (tab() === 'colors') {
            <h2>{{ editingColorId() ? 'Editar color' : 'Nuevo color' }}</h2>
            <form [formGroup]="colorForm" (ngSubmit)="saveColor()">
              <label>Nombre <input formControlName="name" /></label>
              <label>Slug <input formControlName="slug" /></label>
              <label>Hex <input type="color" formControlName="hex_code" /></label>
              <div class="modal-actions">
                <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
                <button type="submit" class="btn btn--primary" [disabled]="colorForm.invalid">Guardar</button>
              </div>
            </form>
          } @else if (tab() === 'sizes') {
            <h2>{{ editingSizeId() ? 'Editar talla' : 'Nueva talla' }}</h2>
            <form [formGroup]="sizeForm" (ngSubmit)="saveSize()">
              <label>Grupo
                <select formControlName="group">
                  @for (g of groups(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                </select>
              </label>
              <label>Código <input formControlName="code" placeholder="M, L, 32…" /></label>
              <label>Orden <input type="number" formControlName="display_order" /></label>
              <div class="modal-actions">
                <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
                <button type="submit" class="btn btn--primary" [disabled]="sizeForm.invalid">Guardar</button>
              </div>
            </form>
          } @else {
            <h2>Nuevo grupo de tallas</h2>
            <form [formGroup]="groupForm" (ngSubmit)="saveGroup()">
              <label>Nombre <input formControlName="name" placeholder="ALPHA_TOP" /></label>
              <label>Descripción <input formControlName="description" /></label>
              <div class="modal-actions">
                <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
                <button type="submit" class="btn btn--primary" [disabled]="groupForm.invalid">Guardar</button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `,
  styles: [
    ADMIN_CRUD_STYLES,
    `
    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.35rem 0.65rem; border-radius: 999px; background: var(--color-surface-2); font-size: 0.875rem;
    }
    .swatch { width: 0.75rem; height: 0.75rem; border-radius: 999px; border: 1px solid rgba(0,0,0,0.1); }
    .chip-btn { border: none; background: none; cursor: pointer; padding: 0 0.25rem; font-size: 0.875rem; }
    `,
  ],
})
export class AdminAttributesPageComponent implements OnInit {
  private readonly catalog = inject(CatalogAdminApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly tab = signal<Tab>('colors');
  protected readonly editorOpen = signal(false);
  protected readonly editingColorId = signal<number | null>(null);
  protected readonly editingSizeId = signal<number | null>(null);
  protected readonly colors = signal<Color[]>([]);
  protected readonly sizes = signal<Size[]>([]);
  protected readonly groups = signal<SizeGroup[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('catalog.products.manage'));

  protected readonly colorForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    hex_code: ['#000000', Validators.required],
  });

  protected readonly groupForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  protected readonly sizeForm = this.fb.nonNullable.group({
    group: ['', Validators.required],
    code: ['', Validators.required],
    display_order: [0, Validators.required],
  });

  ngOnInit(): void { void this.load(); }

  openCreate(): void {
    if (this.tab() === 'colors') {
      this.editingColorId.set(null);
      this.colorForm.reset({ name: '', slug: '', hex_code: '#336699' });
    } else {
      this.groupForm.reset({ name: '', description: '' });
    }
    this.editorOpen.set(true);
  }

  editColor(c: Color): void {
    this.editingColorId.set(c.id);
    this.colorForm.patchValue({ name: c.name, slug: c.slug, hex_code: c.hex_code });
    this.editorOpen.set(true);
  }

  openSizeCreate(): void {
    this.editingSizeId.set(null);
    this.sizeForm.reset({
      group: String(this.groups()[0]?.id ?? ''),
      code: '',
      display_order: 0,
    });
    this.editorOpen.set(true);
  }

  editSize(s: Size): void {
    this.editingSizeId.set(s.id);
    this.sizeForm.patchValue({
      group: String(s.group),
      code: s.code,
      display_order: s.display_order,
    });
    this.editorOpen.set(true);
  }

  closeEditor(): void { this.editorOpen.set(false); }

  async saveColor(): Promise<void> {
    if (this.colorForm.invalid || !this.canManage()) return;
    const body = this.colorForm.getRawValue();
    const id = this.editingColorId();
    try {
      if (id) await firstValueFrom(this.catalog.updateColor(id, body));
      else await firstValueFrom(this.catalog.createColor(body));
      this.notifications.success('Color guardado');
      this.closeEditor();
      await this.loadColors();
    } catch { this.notifications.error('No se pudo guardar'); }
  }

  async saveGroup(): Promise<void> {
    if (this.groupForm.invalid || !this.canManage()) return;
    try {
      await firstValueFrom(this.catalog.createSizeGroup(this.groupForm.getRawValue()));
      this.notifications.success('Grupo creado');
      this.closeEditor();
      await this.loadGroups();
    } catch { this.notifications.error('No se pudo guardar'); }
  }

  async saveSize(): Promise<void> {
    if (this.sizeForm.invalid || !this.canManage()) return;
    const raw = this.sizeForm.getRawValue();
    const body = { group: Number(raw.group), code: raw.code, display_order: raw.display_order };
    const id = this.editingSizeId();
    try {
      if (id) await firstValueFrom(this.catalog.updateSize(id, body));
      else await firstValueFrom(this.catalog.createSize(body));
      this.notifications.success('Talla guardada');
      this.closeEditor();
      await this.loadSizes();
    } catch { this.notifications.error('No se pudo guardar'); }
  }

  async removeColor(c: Color): Promise<void> {
    if (!confirm(`¿Eliminar ${c.name}?`)) return;
    try {
      await firstValueFrom(this.catalog.deleteColor(c.id));
      this.notifications.info('Color eliminado');
      await this.loadColors();
    } catch { this.notifications.error('No se pudo eliminar'); }
  }

  async removeSize(s: Size): Promise<void> {
    if (!confirm(`¿Eliminar talla ${s.code}?`)) return;
    try {
      await firstValueFrom(this.catalog.deleteSize(s.id));
      this.notifications.info('Talla eliminada');
      await this.loadSizes();
    } catch {
      this.notifications.error('No se pudo eliminar (puede estar en uso por variantes)');
    }
  }

  async removeGroup(g: SizeGroup): Promise<void> {
    if (!confirm(`¿Eliminar grupo ${g.name}?`)) return;
    try {
      await firstValueFrom(this.catalog.deleteSizeGroup(g.id));
      this.notifications.info('Grupo eliminado');
      await Promise.all([this.loadGroups(), this.loadSizes()]);
    } catch {
      this.notifications.error('No se pudo eliminar (puede tener tallas asociadas)');
    }
  }

  private async load(): Promise<void> {
    await Promise.all([this.loadColors(), this.loadSizes(), this.loadGroups()]);
  }

  private async loadColors(): Promise<void> {
    const res = await firstValueFrom(this.catalog.listColors());
    this.colors.set(res.results);
  }

  private async loadSizes(): Promise<void> {
    const res = await firstValueFrom(this.catalog.listSizes());
    this.sizes.set(res.results);
  }

  private async loadGroups(): Promise<void> {
    const res = await firstValueFrom(this.catalog.listSizeGroups());
    this.groups.set(res.results);
  }
}
