import { ChangeDetectionStrategy, Component, effect, inject, input, OnDestroy, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ProductImagesApi } from '../../../../core/api/product-images.api';
import type { Color } from '../../../../core/models/admin.models';
import { productImageUrl, type ProductImage } from '../../../../core/models/api.models';
import { NotificationService } from '../../../../core/services/notification.service';

type EditorMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-product-images-manager',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="images-section" aria-labelledby="images-heading">
      <header class="section-header">
        <div>
          <h2 id="images-heading">Imágenes</h2>
          <p class="hint">Sube fotos del producto. Puedes vincularlas a un color o marcar una como principal.</p>
        </div>
        @if (canManage()) {
          <button type="button" class="btn btn--primary" (click)="openCreate()">Subir imagen</button>
        }
      </header>

      @if (loading()) {
        <p class="muted">Cargando imágenes…</p>
      } @else if (!images().length) {
        <p class="empty">Sin imágenes — sube la primera foto del producto.</p>
      } @else {
        <ul class="grid" role="list">
          @for (img of images(); track img.id) {
            <li class="card">
              <button type="button" class="thumb-btn" (click)="openView(img)" [attr.aria-label]="'Ver ' + (img.alt_text || 'imagen')">
                <img [src]="url(img)" [alt]="img.alt_text || 'Imagen del producto'" loading="lazy" />
              </button>
              <div class="card__meta">
                @if (img.is_primary) { <span class="badge badge--primary">Principal</span> }
                @if (img.color_name) { <span class="badge">{{ img.color_name }}</span> }
                <span class="order">#{{ img.display_order ?? 0 }}</span>
              </div>
              @if (canManage()) {
                <div class="card__actions">
                  <button type="button" class="btn btn--ghost" (click)="openEdit(img)">Editar</button>
                  <button type="button" class="btn btn--ghost danger" (click)="remove(img)">Eliminar</button>
                </div>
              }
            </li>
          }
        </ul>
      }
    </section>

    @if (panelOpen()) {
      <div class="modal-backdrop" [class.modal-backdrop--embedded]="embedded()" (click)="closePanel()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="mode() === 'view' ? 'view-title' : 'form-title'"
          (click)="$event.stopPropagation()"
        >
          @if (mode() === 'view' && selected(); as img) {
            <h2 id="view-title">Vista de imagen</h2>
            <figure class="preview preview--large">
              <img [src]="url(img)" [alt]="img.alt_text || 'Imagen del producto'" />
              <figcaption>
                {{ img.alt_text || 'Sin descripción' }}
                @if (img.color_name) { · {{ img.color_name }} }
                @if (img.is_primary) { · Principal }
              </figcaption>
            </figure>
            <div class="modal-actions">
              @if (canManage()) {
                <button type="button" class="btn btn--ghost" (click)="openEdit(img)">Editar</button>
              }
              <button type="button" class="btn btn--primary" (click)="closePanel()">Cerrar</button>
            </div>
          } @else {
            <h2 id="form-title">{{ mode() === 'create' ? 'Subir imagen' : 'Editar imagen' }}</h2>
            <form [formGroup]="form" (ngSubmit)="save()">
              <label class="file-label">
                Archivo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  (change)="onFileSelected($event)"
                />
                @if (mode() === 'edit') {
                  <span class="file-hint">Opcional — déjalo vacío para conservar la imagen actual.</span>
                }
              </label>

              @if (previewUrl()) {
                <figure class="preview">
                  <img [src]="previewUrl()!" alt="Vista previa antes de guardar" />
                  <figcaption>Vista previa — aún no guardada</figcaption>
                </figure>
              }

              <label>Texto alternativo <input formControlName="alt_text" placeholder="Ej. Camisa oxford azul" /></label>

              <div class="form-row">
                <label>Color (opcional)
                  <select formControlName="color">
                    <option value="">Todas las variantes</option>
                    @for (c of colors(); track c.id) {
                      <option [value]="c.id">{{ c.name }}</option>
                    }
                  </select>
                </label>
                <label>Orden <input type="number" formControlName="display_order" min="0" /></label>
              </div>

              <label class="inline">
                <input type="checkbox" formControlName="is_primary" />
                Imagen principal del producto
              </label>

              <div class="modal-actions">
                <button type="button" class="btn btn--ghost" (click)="closePanel()">Cancelar</button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  [disabled]="form.invalid || saving() || (mode() === 'create' && !pendingFile())"
                >
                  {{ saving() ? 'Guardando…' : 'Guardar' }}
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .images-section { margin-top: 1.5rem; }
    .section-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    h2 { font-family: var(--font-display); margin: 0; font-size: 1.125rem; }
    .hint, .muted, .empty { color: var(--color-muted); font-size: 0.875rem; margin: 0.25rem 0 0; }
    .empty { padding: 1rem; border: 1px dashed var(--color-border); border-radius: 0.75rem; text-align: center; }
    .grid {
      list-style: none; padding: 0; margin: 0;
      display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem;
    }
    .card {
      border: 1px solid var(--color-border); border-radius: 0.75rem;
      background: var(--color-surface); overflow: hidden; display: grid;
    }
    .thumb-btn {
      border: none; padding: 0; background: var(--color-surface-2); cursor: pointer; aspect-ratio: 1;
      display: grid; place-items: center; overflow: hidden;
    }
    .thumb-btn img { width: 100%; height: 100%; object-fit: cover; }
    .card__meta { display: flex; flex-wrap: wrap; gap: 0.35rem; padding: 0.5rem 0.625rem; align-items: center; }
    .badge { font-size: 0.6875rem; padding: 0.15rem 0.45rem; border-radius: 999px; background: var(--color-surface-2); }
    .badge--primary { background: color-mix(in srgb, var(--color-accent) 15%, white); color: var(--color-accent); font-weight: 600; }
    .order { margin-left: auto; font-size: 0.75rem; color: var(--color-muted); }
    .card__actions { display: flex; gap: 0.25rem; padding: 0 0.5rem 0.5rem; flex-wrap: wrap; }
    .danger { color: #b91c1c; }
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: grid; place-items: center; z-index: 100; padding: 1rem;
    }
    .modal-backdrop--embedded { z-index: 200; }
    .modal {
      width: min(520px, 100%); max-height: 90dvh; overflow: auto;
      background: var(--color-surface); border-radius: 1rem; padding: 1.25rem;
      border: 1px solid var(--color-border);
    }
    .modal h2 { margin: 0 0 1rem; font-family: var(--font-display); font-size: 1.125rem; }
    form { display: grid; gap: 0.875rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
    label.inline { display: flex; align-items: center; gap: 0.5rem; font-weight: 400; }
    input, select {
      border: 1px solid var(--color-border); border-radius: 0.625rem;
      padding: 0.625rem 0.75rem; font: inherit; background: var(--color-bg);
    }
    .file-label input[type='file'] { padding: 0.5rem; }
    .file-hint { font-size: 0.75rem; color: var(--color-muted); font-weight: 400; }
    .preview {
      margin: 0; border: 1px solid var(--color-border); border-radius: 0.75rem;
      overflow: hidden; background: var(--color-surface-2);
    }
    .preview img { width: 100%; max-height: 280px; object-fit: contain; display: block; background: #111; }
    .preview--large img { max-height: 420px; }
    figcaption { padding: 0.5rem 0.75rem; font-size: 0.8125rem; color: var(--color-muted); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.25rem; }
    @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
  `,
})
export class ProductImagesManagerComponent implements OnDestroy {
  private readonly imagesApi = inject(ProductImagesApi);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly productId = input.required<number>();
  readonly canManage = input(false);
  readonly colors = input<Color[]>([]);
  /** Dentro de otro modal (ej. editor de producto) — eleva z-index */
  readonly embedded = input(false);
  readonly changed = output<void>();

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly panelOpen = signal(false);
  protected readonly mode = signal<EditorMode>('create');
  protected readonly images = signal<ProductImage[]>([]);
  protected readonly selected = signal<ProductImage | null>(null);
  protected readonly pendingFile = signal<File | null>(null);
  protected readonly previewUrl = signal<string | null>(null);

  protected readonly url = productImageUrl;

  protected readonly form = this.fb.nonNullable.group({
    alt_text: ['', Validators.required],
    color: [''],
    display_order: [0],
    is_primary: [false],
  });

  constructor() {
    effect(() => {
      const id = this.productId();
      if (id) void this.load(id);
    });
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  openCreate(): void {
    this.mode.set('create');
    this.selected.set(null);
    this.pendingFile.set(null);
    this.revokePreview();
    this.form.reset({ alt_text: '', color: '', display_order: 0, is_primary: false });
    this.panelOpen.set(true);
  }

  openView(img: ProductImage): void {
    this.mode.set('view');
    this.selected.set(img);
    this.panelOpen.set(true);
  }

  openEdit(img: ProductImage): void {
    this.mode.set('edit');
    this.selected.set(img);
    this.pendingFile.set(null);
    this.revokePreview();
    this.setPreviewFromExisting(img);
    this.form.patchValue({
      alt_text: img.alt_text,
      color: img.color ? String(img.color) : '',
      display_order: img.display_order ?? 0,
      is_primary: img.is_primary,
    });
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.pendingFile.set(null);
    this.revokePreview();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.pendingFile.set(file);
    this.revokePreview();
    if (file) {
      this.previewUrl.set(URL.createObjectURL(file));
    } else if (this.mode() === 'edit' && this.selected()) {
      this.setPreviewFromExisting(this.selected()!);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || !this.canManage()) return;
    const mode = this.mode();
    if (mode === 'create' && !this.pendingFile()) {
      this.notifications.warn('Selecciona una imagen para subir');
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const meta = {
      alt_text: raw.alt_text,
      color: raw.color ? Number(raw.color) : null,
      display_order: raw.display_order,
      is_primary: raw.is_primary,
    };

    try {
      if (mode === 'create') {
        const fd = this.imagesApi.buildFormData(this.productId(), this.pendingFile()!, meta);
        await firstValueFrom(this.imagesApi.create(fd));
        this.notifications.success('Imagen subida');
      } else {
        const id = this.selected()?.id;
        if (!id) return;
        if (this.pendingFile()) {
          const fd = this.imagesApi.buildFormData(this.productId(), this.pendingFile(), meta);
          await firstValueFrom(this.imagesApi.update(id, fd));
        } else {
          await firstValueFrom(this.imagesApi.updateMeta(id, meta));
        }
        this.notifications.success('Imagen actualizada');
      }
      this.closePanel();
      await this.load(this.productId());
      this.changed.emit();
    } catch {
      this.notifications.error('No se pudo guardar la imagen');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(img: ProductImage): Promise<void> {
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
      await firstValueFrom(this.imagesApi.delete(img.id));
      this.notifications.info('Imagen eliminada');
      await this.load(this.productId());
      this.changed.emit();
    } catch {
      this.notifications.error('No se pudo eliminar');
    }
  }

  private async load(productId: number): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.imagesApi.list({ product: productId }));
      this.images.set(res.results);
    } finally {
      this.loading.set(false);
    }
  }

  private setPreviewFromExisting(img: ProductImage): void {
    this.previewUrl.set(productImageUrl(img));
  }

  private revokePreview(): void {
    const current = this.previewUrl();
    if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
    this.previewUrl.set(null);
  }
}
