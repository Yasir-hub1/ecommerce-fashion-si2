import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import { ProductImagesApi } from '../../../../core/api/product-images.api';
import { ProductImageDraftFieldComponent } from '../../../../features/catalog/components/product-images/product-image-draft-field.component';
import { ProductImagesManagerComponent } from '../../../../features/catalog/components/product-images/product-images-manager.component';
import { GENDERS, type Collection, type Color } from '../../../../core/models/admin.models';
import type { Brand, Category, ProductListItem } from '../../../../core/models/api.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-admin-products-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PricePipe,
    EmptyStateComponent,
    ProductImagesManagerComponent,
    ProductImageDraftFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Productos</h1>
        <p class="subtitle">Catálogo FashionStore · datos, imágenes y variantes.</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openCreate()">Nuevo producto</button>
      }
    </header>

    @if (loading()) { <p>Cargando…</p> }
    @else if (!products().length) {
      <app-empty-state icon="🏷️" title="Sin productos" description="Crea categorías, marcas y colecciones primero." />
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th></th><th>Producto</th><th>Marca</th><th>Categoría</th><th>Precio</th><th></th></tr>
          </thead>
          <tbody>
            @for (p of products(); track p.id) {
              <tr>
                <td class="thumb-cell">
                  @if (p.primary_image) {
                    <img [src]="p.primary_image" [alt]="p.name" class="thumb" loading="lazy" />
                  } @else {
                    <span class="thumb thumb--empty">—</span>
                  }
                </td>
                <td>
                  <a [routerLink]="['/admin/productos', p.id]">{{ p.name }}</a>
                  <span class="badge">{{ p.is_active ? 'Activo' : 'Inactivo' }}</span>
                </td>
                <td>{{ p.brand_name }}</td>
                <td>{{ p.category_name }}</td>
                <td>{{ p.base_price | price }}</td>
                <td class="actions">
                  @if (canManage()) {
                    <button type="button" class="btn btn--ghost" (click)="openEdit(p)">Editar</button>
                  }
                  <button type="button" class="btn btn--ghost" (click)="openView(p)">Ver</button>
                  <a [routerLink]="['/ecommerce/producto', p.id]" class="btn btn--ghost">Tienda</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (editorOpen()) {
      <div class="modal-backdrop" (click)="closeEditor()">
        <div class="modal editor-modal" role="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editorTitle() }}</h2>

          @if (viewOnly()) {
            @if (viewProduct(); as vp) {
              <div class="view-grid">
                @if (vp.primary_image) {
                  <img [src]="vp.primary_image" [alt]="vp.name" class="view-img" />
                }
                <dl>
                  <dt>Nombre</dt><dd>{{ vp.name }}</dd>
                  <dt>Marca</dt><dd>{{ vp.brand_name }}</dd>
                  <dt>Categoría</dt><dd>{{ vp.category_name }}</dd>
                  <dt>Precio</dt><dd>{{ vp.base_price | price }}</dd>
                </dl>
              </div>
              @if (editorProductId()) {
                <app-product-images-manager
                  [productId]="editorProductId()!"
                  [canManage]="false"
                  [colors]="colors()"
                  [embedded]="true"
                />
              }
              <div class="modal-actions">
                <button type="button" class="btn btn--primary" (click)="closeEditor()">Cerrar</button>
              </div>
            }
          } @else {
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="form-scroll">
                <label>Nombre <input formControlName="name" /></label>
                <label>Descripción <textarea formControlName="description" rows="2"></textarea></label>
                <div class="form-row">
                  <label>Categoría
                    <select formControlName="category_id">
                      @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                    </select>
                  </label>
                  <label>Marca
                    <select formControlName="brand_id">
                      @for (b of brands(); track b.id) { <option [value]="b.id">{{ b.name }}</option> }
                    </select>
                  </label>
                </div>
                <label>Colección
                  <select formControlName="collection_id">
                    @for (c of collections(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                  </select>
                </label>
                <div class="form-row">
                  <label>Género
                    <select formControlName="gender">
                      @for (g of genders; track g.value) { <option [value]="g.value">{{ g.label }}</option> }
                    </select>
                  </label>
                  <label>Precio base <input type="number" step="0.01" formControlName="base_price" /></label>
                </div>
                <label>Material <input formControlName="material" /></label>
                <label class="inline"><input type="checkbox" formControlName="is_active" /> Activo</label>

                @if (editorProductId()) {
                  <app-product-images-manager
                    [productId]="editorProductId()!"
                    [canManage]="canManage()"
                    [colors]="colors()"
                    [embedded]="true"
                    (changed)="onImagesChanged()"
                  />
                } @else if (canManage()) {
                  <app-product-image-draft-field (draftChange)="onDraftChange($event)" />
                }
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn--ghost" (click)="closeEditor()">
                  {{ editorProductId() ? 'Listo' : 'Cancelar' }}
                </button>
                <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">
                  {{ saving() ? 'Guardando…' : (editorProductId() ? 'Actualizar datos' : 'Crear producto') }}
                </button>
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
    td .badge { margin-left: 0.5rem; }
    .thumb-cell { width: 3.5rem; }
    .thumb { width: 2.75rem; height: 2.75rem; object-fit: cover; border-radius: 0.5rem; border: 1px solid var(--color-border); }
    .thumb--empty { display: grid; place-items: center; background: var(--color-surface-2); color: var(--color-muted); font-size: 0.75rem; }
    .editor-modal { width: min(680px, 100%); max-height: 92dvh; display: flex; flex-direction: column; }
    .form-scroll { overflow-y: auto; max-height: calc(92dvh - 8rem); display: grid; gap: 0.875rem; padding-right: 0.25rem; }
    .view-grid { display: grid; grid-template-columns: 8rem 1fr; gap: 1rem; margin-bottom: 1rem; }
    .view-img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 0.75rem; border: 1px solid var(--color-border); }
    dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 0.35rem 0.75rem; font-size: 0.875rem; }
    dt { color: var(--color-muted); }
    dd { margin: 0; }
    @media (max-width: 640px) { .view-grid { grid-template-columns: 1fr; } }
    `,
  ],
})
export class AdminProductsPageComponent implements OnInit {
  private readonly catalog = inject(CatalogAdminApi);
  private readonly imagesApi = inject(ProductImagesApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly genders = GENDERS;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly viewOnly = signal(false);
  protected readonly editorProductId = signal<number | null>(null);
  protected readonly viewProduct = signal<ProductListItem | null>(null);
  protected readonly products = signal<ProductListItem[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly brands = signal<Brand[]>([]);
  protected readonly collections = signal<Collection[]>([]);
  protected readonly colors = signal<Color[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('catalog.products.manage'));

  protected readonly editorTitle = computed(() => {
    if (this.viewOnly()) return 'Ver producto';
    return this.editorProductId() ? 'Editar producto' : 'Nuevo producto';
  });

  private imageDraft: { file: File | null; alt_text: string; is_primary: boolean } = {
    file: null, alt_text: '', is_primary: true,
  };

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    category_id: ['', Validators.required],
    brand_id: ['', Validators.required],
    collection_id: ['', Validators.required],
    gender: ['UNISEX', Validators.required],
    base_price: ['', Validators.required],
    material: [''],
    is_active: [true],
  });

  ngOnInit(): void { void this.init(); }

  openCreate(): void {
    this.viewOnly.set(false);
    this.editorProductId.set(null);
    this.viewProduct.set(null);
    this.imageDraft = { file: null, alt_text: '', is_primary: true };
    this.form.reset({
      name: '', description: '',
      category_id: String(this.categories()[0]?.id ?? ''),
      brand_id: String(this.brands()[0]?.id ?? ''),
      collection_id: String(this.collections()[0]?.id ?? ''),
      gender: 'UNISEX', base_price: '', material: '', is_active: true,
    });
    this.editorOpen.set(true);
  }

  openView(p: ProductListItem): void {
    this.viewOnly.set(true);
    this.editorProductId.set(p.id);
    this.viewProduct.set(p);
    this.editorOpen.set(true);
  }

  async openEdit(p: ProductListItem): Promise<void> {
    this.viewOnly.set(false);
    this.editorProductId.set(p.id);
    this.viewProduct.set(null);
    try {
      const detail = await firstValueFrom(this.catalog.getProduct(p.id));
      this.form.patchValue({
        name: detail.name,
        description: detail.description,
        category_id: String(detail.category.id),
        brand_id: String(detail.brand.id),
        collection_id: String(detail.collection.id),
        gender: detail.gender,
        base_price: detail.base_price,
        material: detail.material,
        is_active: detail.is_active,
      });
      this.editorOpen.set(true);
    } catch { this.notifications.error('No se pudo cargar el producto'); }
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editorProductId.set(null);
    this.viewOnly.set(false);
  }

  onDraftChange(draft: { file: File | null; alt_text: string; is_primary: boolean }): void {
    this.imageDraft = draft;
  }

  async onImagesChanged(): Promise<void> {
    await this.loadProducts();
  }

  async save(): Promise<void> {
    if (this.form.invalid || !this.canManage()) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name!,
      description: raw.description ?? '',
      category_id: Number(raw.category_id),
      brand_id: Number(raw.brand_id),
      collection_id: Number(raw.collection_id),
      gender: raw.gender!,
      base_price: String(raw.base_price),
      material: raw.material ?? '',
      is_active: raw.is_active ?? true,
    };

    try {
      let productId = this.editorProductId();
      if (productId) {
        await firstValueFrom(this.catalog.updateProduct(productId, body));
        this.notifications.success('Producto actualizado');
      } else {
        const created = await firstValueFrom(this.catalog.createProduct(body));
        productId = created.id;
        this.editorProductId.set(productId);
        this.notifications.success('Producto creado — ahora puedes subir más imágenes');

        if (this.imageDraft.file) {
          const alt = this.imageDraft.alt_text || raw.name || 'Imagen del producto';
          const fd = this.imagesApi.buildFormData(productId, this.imageDraft.file, {
            alt_text: alt,
            is_primary: this.imageDraft.is_primary,
            display_order: 0,
            color: null,
          });
          await firstValueFrom(this.imagesApi.create(fd));
          this.notifications.success('Imagen principal subida');
        }
      }
      await this.loadProducts();
    } catch {
      this.notifications.error('No se pudo guardar');
    } finally {
      this.saving.set(false);
    }
  }

  private async init(): Promise<void> {
    try {
      const [products, categories, brands, collections, colors] = await Promise.all([
        firstValueFrom(this.catalog.listProducts({})),
        firstValueFrom(this.catalog.listCategories()),
        firstValueFrom(this.catalog.listBrands()),
        firstValueFrom(this.catalog.listCollections()),
        firstValueFrom(this.catalog.listColors()),
      ]);
      this.products.set(products.results);
      this.categories.set(categories.results);
      this.brands.set(brands.results);
      this.collections.set(collections.results);
      this.colors.set(colors.results);
    } finally { this.loading.set(false); }
  }

  private async loadProducts(): Promise<void> {
    const res = await firstValueFrom(this.catalog.listProducts({}));
    this.products.set(res.results);
  }
}
