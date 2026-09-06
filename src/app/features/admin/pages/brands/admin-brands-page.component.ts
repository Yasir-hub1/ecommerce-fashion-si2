import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import type { Brand } from '../../../../core/models/admin.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-admin-brands-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Marcas</h1>
        <p class="subtitle">Marcas comerciales del catálogo (Product → Brand).</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openCreate()">Nueva marca</button>
      }
    </header>

    @if (loading()) { <p>Cargando…</p> }
    @else if (!items().length) {
      <app-empty-state icon="🏷️" title="Sin marcas" description="Registra marcas antes de publicar productos." />
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Slug</th><th>Logo</th><th>Productos</th>@if (canManage()) { <th></th> }</tr></thead>
          <tbody>
            @for (b of items(); track b.id) {
              <tr>
                <td>{{ b.name }}</td>
                <td>{{ b.slug }}</td>
                <td>
                  @if (b.logo_url) {
                    <img class="logo-thumb" [src]="b.logo_url" [alt]="'Logo de ' + b.name" />
                  } @else {
                    —
                  }
                </td>
                <td>{{ b.products_count ?? 0 }}</td>
                @if (canManage()) {
                  <td class="actions">
                    <button type="button" class="btn btn--ghost" (click)="openEdit(b)">Editar</button>
                    <button
                      type="button"
                      class="btn btn--ghost danger"
                      [disabled]="(b.products_count ?? 0) > 0"
                      [title]="(b.products_count ?? 0) > 0 ? 'Tiene productos asociados' : 'Eliminar marca'"
                      (click)="remove(b)"
                    >Eliminar</button>
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
          <h2>{{ editingId() ? 'Editar marca' : 'Nueva marca' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label>Nombre <input formControlName="name" /></label>
            <label>Slug <input formControlName="slug" placeholder="zara" /></label>

            <label class="file-label">
              Logo (opcional)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                (change)="onLogoSelected($event)"
              />
            </label>

            @if (logoPreview()) {
              <figure class="logo-preview">
                <img [src]="logoPreview()!" alt="Vista previa del logo" />
              </figure>
            }

            @if (existingLogoUrl() && !logoFile() && !removeLogo()) {
              <figure class="logo-preview">
                <img [src]="existingLogoUrl()!" [alt]="'Logo actual de ' + form.controls.name.value" />
                <figcaption>Logo actual</figcaption>
              </figure>
            }

            @if (existingLogoUrl()) {
              <label class="inline">
                <input type="checkbox" [checked]="removeLogo()" (change)="onRemoveLogoChange($event)" />
                Quitar logo
              </label>
            }

            <div class="modal-actions">
              <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [
    ADMIN_CRUD_STYLES,
    `
      .logo-thumb {
        width: 2.5rem;
        height: 2.5rem;
        object-fit: contain;
        border-radius: 0.375rem;
        border: 1px solid var(--color-border);
        background: var(--color-surface-2);
      }
      .file-label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
      .logo-preview {
        margin: 0;
        border: 1px solid var(--color-border);
        border-radius: 0.75rem;
        overflow: hidden;
        background: var(--color-surface-2);
      }
      .logo-preview img {
        display: block;
        width: 100%;
        max-height: 120px;
        object-fit: contain;
        background: #111;
      }
      figcaption {
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
        color: var(--color-muted);
      }
      label.inline {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 400;
      }
    `,
  ],
})
export class AdminBrandsPageComponent implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogAdminApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly items = signal<Brand[]>([]);
  protected readonly logoFile = signal<File | null>(null);
  protected readonly logoPreview = signal<string | null>(null);
  protected readonly existingLogoUrl = signal<string | null>(null);
  protected readonly removeLogo = signal(false);
  protected readonly canManage = computed(() => this.permissions.has('catalog.products.manage'));

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
  });

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  openCreate(): void {
    this.resetEditor();
    this.editingId.set(null);
    this.editorOpen.set(true);
  }

  openEdit(b: Brand): void {
    this.resetEditor();
    this.editingId.set(b.id);
    this.form.patchValue({ name: b.name, slug: b.slug });
    this.existingLogoUrl.set(b.logo_url ?? null);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.resetEditor();
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.revokePreview();
    this.logoFile.set(file);
    this.removeLogo.set(false);
    if (file) {
      this.logoPreview.set(URL.createObjectURL(file));
    }
  }

  onRemoveLogoChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.removeLogo.set(checked);
    if (checked) {
      this.revokePreview();
      this.logoFile.set(null);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || !this.canManage()) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const name = raw.name!;
    const slug = raw.slug!;
    const id = this.editingId();
    const file = this.logoFile();
    const shouldRemoveLogo = this.removeLogo();

    try {
      if (file) {
        const body = this.catalog.buildBrandFormData(name, slug, file);
        if (id) await firstValueFrom(this.catalog.updateBrand(id, body));
        else await firstValueFrom(this.catalog.createBrand(body));
      } else if (id && shouldRemoveLogo) {
        const body = this.catalog.buildBrandFormData(name, slug, null, true);
        await firstValueFrom(this.catalog.updateBrand(id, body));
      } else {
        const body = { name, slug };
        if (id) await firstValueFrom(this.catalog.updateBrand(id, body));
        else await firstValueFrom(this.catalog.createBrand(body));
      }
      this.notifications.success('Marca guardada');
      this.closeEditor();
      await this.load();
    } catch {
      this.notifications.error('No se pudo guardar');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(b: Brand): Promise<void> {
    if ((b.products_count ?? 0) > 0) return;
    if (!confirm(`¿Eliminar ${b.name}?`)) return;
    try {
      await firstValueFrom(this.catalog.deleteBrand(b.id));
      this.notifications.info('Marca eliminada');
      await this.load();
    } catch {
      /* errorInterceptor muestra el detalle del API */
    }
  }

  private resetEditor(): void {
    this.form.reset({ name: '', slug: '' });
    this.revokePreview();
    this.logoFile.set(null);
    this.existingLogoUrl.set(null);
    this.removeLogo.set(false);
  }

  private revokePreview(): void {
    const url = this.logoPreview();
    if (url) URL.revokeObjectURL(url);
    this.logoPreview.set(null);
  }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.catalog.listBrands());
      this.items.set(res.results);
    } finally {
      this.loading.set(false);
    }
  }
}
