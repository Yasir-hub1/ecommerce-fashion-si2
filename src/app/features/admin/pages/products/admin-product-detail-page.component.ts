import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ProductImagesManagerComponent } from '../../../../features/catalog/components/product-images/product-images-manager.component';
import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import type { Color, Size, VariantDetail } from '../../../../core/models/admin.models';
import type { ProductDetail } from '../../../../core/models/api.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-admin-product-detail-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, PricePipe, ProductImagesManagerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <a routerLink="/admin/productos" class="back">← Productos</a>
        <h1 class="page-title">{{ product()?.name ?? 'Producto' }}</h1>
        <p class="subtitle">Variantes (SKU = talla × color) e imágenes del producto</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openVariantModal()">Nueva variante</button>
      }
    </header>

    @if (loading()) { <p>Cargando…</p> }
    @else if (product(); as p) {
      <section class="meta">
        <span>{{ p.brand.name }} · {{ p.category.name }}</span>
        <span>{{ p.collection.name }} · {{ p.base_price | price }}</span>
      </section>

      <app-product-images-manager
        [productId]="productId"
        [canManage]="canManage()"
        [colors]="colors()"
        (changed)="onImagesChanged()"
      />

      <h2 class="section-title">Variantes</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>SKU</th><th>Talla</th><th>Color</th><th>Precio</th><th>Estado</th>@if (canManage()) { <th></th> }</tr></thead>
          <tbody>
            @for (v of variants(); track v.id) {
              <tr>
                <td>{{ v.sku }}</td>
                <td>{{ sizeLabel(v) }}</td>
                <td>{{ colorLabel(v) }}</td>
                <td>{{ v.effective_price | price }}</td>
                <td>{{ v.is_active ? 'Activa' : 'Inactiva' }}</td>
                @if (canManage()) {
                  <td class="actions">
                    <button type="button" class="btn btn--ghost danger" (click)="removeVariant(v)">Eliminar</button>
                  </td>
                }
              </tr>
            } @empty {
              <tr><td colspan="6">Sin variantes — agrega talla + color.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (variantModal()) {
      <div class="modal-backdrop" (click)="closeVariantModal()">
        <div class="modal" role="dialog" (click)="$event.stopPropagation()">
          <h2>Nueva variante</h2>
          <form [formGroup]="variantForm" (ngSubmit)="saveVariant()">
            <label>Talla
              <select formControlName="size">
                @for (s of sizes(); track s.id) { <option [value]="s.id">{{ s.group_name }} · {{ s.code }}</option> }
              </select>
            </label>
            <label>Color
              <select formControlName="color">
                @for (c of colors(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
              </select>
            </label>
            <label>Precio override (opcional) <input type="number" step="0.01" formControlName="price_override" /></label>
            <label>Código de barras <input formControlName="barcode" /></label>
            <div class="modal-actions">
              <button type="button" class="btn btn--ghost" (click)="closeVariantModal()">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="variantForm.invalid">Crear</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [ADMIN_CRUD_STYLES, `.back { font-size: 0.875rem; color: var(--color-muted); text-decoration: none; } .meta { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; color: var(--color-muted); font-size: 0.875rem; } .section-title { font-family: var(--font-display); font-size: 1.125rem; margin: 1.5rem 0 0.75rem; }`],
})
export class AdminProductDetailPageComponent implements OnInit {
  private readonly catalog = inject(CatalogAdminApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly variantModal = signal(false);
  protected readonly product = signal<ProductDetail | null>(null);
  protected readonly variants = signal<VariantDetail[]>([]);
  protected readonly sizes = signal<Size[]>([]);
  protected readonly colors = signal<Color[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('catalog.products.manage'));

  private readonly route = inject(ActivatedRoute);

  protected readonly productId = Number(this.route.snapshot.paramMap.get('id') ?? '0');

  protected readonly variantForm = this.fb.group({
    size: ['', Validators.required],
    color: ['', Validators.required],
    price_override: [''],
    barcode: [''],
  });

  private productIdInternal = 0;

  ngOnInit(): void {
    this.productIdInternal = this.productId;
    void this.load();
  }

  async onImagesChanged(): Promise<void> {
    try {
      const product = await firstValueFrom(this.catalog.getProduct(this.productIdInternal));
      this.product.set(product);
    } catch { /* keep current */ }
  }

  sizeLabel(v: VariantDetail): string {
    if (typeof v.size === 'object' && v.size) return v.size.code;
    return this.sizes().find((s) => s.id === v.size)?.code ?? '—';
  }

  colorLabel(v: VariantDetail): string {
    if (typeof v.color === 'object' && v.color) return v.color.name;
    return this.colors().find((c) => c.id === v.color)?.name ?? '—';
  }

  openVariantModal(): void {
    this.variantForm.reset({
      size: String(this.sizes()[0]?.id ?? ''),
      color: String(this.colors()[0]?.id ?? ''),
      price_override: '', barcode: '',
    });
    this.variantModal.set(true);
  }

  closeVariantModal(): void { this.variantModal.set(false); }

  async saveVariant(): Promise<void> {
    if (this.variantForm.invalid || !this.canManage()) return;
    const raw = this.variantForm.getRawValue();
    try {
      await firstValueFrom(this.catalog.createVariant({
        product: this.productIdInternal,
        size: Number(raw.size),
        color: Number(raw.color),
        price_override: raw.price_override ? String(raw.price_override) : null,
        barcode: raw.barcode ?? '',
      }));
      this.notifications.success('Variante creada');
      this.closeVariantModal();
      await this.loadVariants();
    } catch { this.notifications.error('No se pudo crear la variante'); }
  }

  async removeVariant(v: VariantDetail): Promise<void> {
    if (!confirm(`¿Eliminar variante ${v.sku}?`)) return;
    try {
      await firstValueFrom(this.catalog.deleteVariant(v.id));
      this.notifications.info('Variante eliminada');
      await this.loadVariants();
    } catch { this.notifications.error('No se pudo eliminar'); }
  }

  private async load(): Promise<void> {
    try {
      const [product, sizes, colors] = await Promise.all([
        firstValueFrom(this.catalog.getProduct(this.productIdInternal)),
        firstValueFrom(this.catalog.listSizes()),
        firstValueFrom(this.catalog.listColors()),
      ]);
      this.product.set(product);
      this.sizes.set(sizes.results);
      this.colors.set(colors.results);
      await this.loadVariants();
    } finally { this.loading.set(false); }
  }

  private async loadVariants(): Promise<void> {
    const res = await firstValueFrom(this.catalog.listVariants({ product: this.productIdInternal }));
    this.variants.set(res.results);
  }
}
