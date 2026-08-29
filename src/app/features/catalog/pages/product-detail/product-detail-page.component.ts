import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CatalogApi } from '../../../../core/api/auth.api';
import { ReservationsApi } from '../../../../core/api/reservations.api';
import { AuthService } from '../../../../core/auth/auth.service';
import { BranchContextService } from '../../../../core/services/branch-context.service';
import { CartStore } from '../../../../core/services/cart.store';
import { NotificationService } from '../../../../core/services/notification.service';
import type { ProductDetail, ProductImage, ProductVariant, VariantAvailability } from '../../../../core/models/api.models';
import { productImageUrl } from '../../../../core/models/api.models';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [RouterLink, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <p class="loading">Cargando producto…</p>
    } @else if (product()) {
      <div class="detail">
        <nav class="breadcrumb">
          <a routerLink="/ecommerce">Catálogo</a>
          <span>/</span>
          <span>{{ product()!.name }}</span>
        </nav>

        <div class="detail__grid">
          <div class="gallery">
            @if (galleryImage()) {
              <img [src]="galleryImage()!" [alt]="product()!.name" />
            } @else {
              <div class="placeholder">Sin imagen</div>
            }
            @if (product()!.images.length > 1) {
              <div class="thumbs">
                @for (img of product()!.images; track img.id) {
                  <button
                    type="button"
                    class="thumb"
                    [class.thumb--active]="galleryImage() === imageUrl(img)"
                    (click)="selectGalleryImage(img)"
                  >
                    <img [src]="imageUrl(img)" [alt]="img.alt_text || product()!.name" loading="lazy" />
                  </button>
                }
              </div>
            }
          </div>

          <div class="info">
            <p class="meta">{{ product()!.brand.name }} · {{ product()!.category.name }}</p>
            <h1>{{ product()!.name }}</h1>
            <p class="price">{{ selectedPrice() | price }}</p>
            <p class="desc">{{ product()!.description }}</p>

            <div class="selector">
              <p class="selector__label">Color</p>
              <div class="chips">
                @for (color of colors(); track color.id) {
                  <button
                    type="button"
                    class="chip"
                    [class.chip--active]="selectedColorId() === color.id"
                    [class.chip--disabled]="!color.available"
                    [disabled]="!color.available"
                    (click)="selectColor(color.id)"
                    [attr.aria-pressed]="selectedColorId() === color.id"
                  >
                    <span class="swatch" [style.background]="color.hex"></span>
                    {{ color.name }}
                    @if (!color.available) { <small>(agotado)</small> }
                  </button>
                }
              </div>
            </div>

            <div class="selector">
              <p class="selector__label">Talla</p>
              <div class="chips">
                @for (size of sizes(); track size.id) {
                  <button
                    type="button"
                    class="chip chip--size"
                    [class.chip--active]="selectedSizeId() === size.id"
                    [class.chip--disabled]="!size.available"
                    [disabled]="!size.available"
                    (click)="selectSize(size.id)"
                  >
                    {{ size.name }}
                  </button>
                }
              </div>
            </div>

            @if (selectedVariant()) {
              <p class="availability" [class.availability--low]="availableQty() <= 3">
                {{ availableQty() }} disponible(s) en {{ branchContext.selectedBranch()?.name }}
              </p>
            }

            <div class="actions">
              <button
                type="button"
                class="btn btn--primary"
                [disabled]="!canAddToCart()"
                (click)="addToCart()"
              >
                Agregar al carrito
              </button>
              <button
                type="button"
                class="btn btn--secondary"
                [disabled]="!canReserve()"
                (click)="openReservation = !openReservation"
              >
                Reservar probador
              </button>
            </div>

            @if (openReservation) {
              <div class="reservation-box">
                <h3>Reserva para probador</h3>
                <p class="hint">
                  Tu reserva vence automáticamente. Llega puntual a la sucursal.
                </p>
                <label>
                  Fecha y hora
                  <input type="datetime-local" [value]="scheduledFor()" (change)="onScheduleChange($event)" />
                </label>
                <button type="button" class="btn btn--primary btn--block" [disabled]="reserving()" (click)="createReservation()">
                  {{ reserving() ? 'Reservando…' : 'Confirmar reserva' }}
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .breadcrumb { display: flex; gap: 0.5rem; color: var(--color-muted); font-size: 0.875rem; margin-bottom: 1rem; }
    .breadcrumb a { color: inherit; }
    .detail__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .gallery img, .placeholder {
      width: 100%; aspect-ratio: 4/5; object-fit: cover; border-radius: 1rem;
      background: var(--color-surface-2);
    }
    .placeholder { display: grid; place-items: center; color: var(--color-muted); }
    .thumbs { display: flex; gap: 0.5rem; margin-top: 0.75rem; overflow-x: auto; }
    .thumb {
      border: 2px solid transparent; border-radius: 0.5rem; padding: 0; cursor: pointer;
      width: 4rem; height: 4rem; overflow: hidden; flex-shrink: 0; background: var(--color-surface-2);
    }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .thumb--active { border-color: var(--color-accent); }
    .meta { color: var(--color-muted); margin: 0 0 0.25rem; font-size: 0.875rem; }
    h1 { font-family: var(--font-display); margin: 0 0 0.5rem; font-size: 2rem; }
    .price { font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem; }
    .desc { color: var(--color-muted); line-height: 1.7; margin-bottom: 1.5rem; }
    .selector { margin-bottom: 1rem; }
    .selector__label { font-size: 0.8125rem; font-weight: 600; margin: 0 0 0.5rem; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip {
      display: inline-flex; align-items: center; gap: 0.375rem;
      border: 1px solid var(--color-border); background: var(--color-surface);
      border-radius: 999px; padding: 0.45rem 0.75rem; cursor: pointer; font: inherit;
    }
    .chip--size { min-width: 2.5rem; justify-content: center; border-radius: 0.5rem; }
    .chip--active { border-color: var(--color-accent); box-shadow: 0 0 0 1px var(--color-accent); }
    .chip--disabled { opacity: 0.45; cursor: not-allowed; text-decoration: line-through; }
    .swatch { width: 0.875rem; height: 0.875rem; border-radius: 999px; border: 1px solid rgba(0,0,0,0.1); }
    .availability { font-size: 0.875rem; margin: 0.5rem 0 1rem; }
    .availability--low { color: #b45309; font-weight: 600; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
    .reservation-box {
      margin-top: 1rem; padding: 1rem; border-radius: 0.875rem;
      border: 1px dashed var(--color-border); background: var(--color-surface-2);
    }
    .reservation-box h3 { margin: 0 0 0.5rem; font-size: 1rem; }
    .hint { font-size: 0.8125rem; color: var(--color-muted); margin: 0 0 0.75rem; }
    .reservation-box label { display: grid; gap: 0.375rem; font-size: 0.875rem; margin-bottom: 0.75rem; }
    .reservation-box input {
      border: 1px solid var(--color-border); border-radius: 0.625rem; padding: 0.625rem; font: inherit;
    }
    @media (max-width: 900px) { .detail__grid { grid-template-columns: 1fr; } }
  `,
})
export class ProductDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogApi = inject(CatalogApi);
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly cartStore = inject(CartStore);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  protected readonly branchContext = inject(BranchContextService);

  protected readonly loading = signal(true);
  protected readonly product = signal<ProductDetail | null>(null);
  protected readonly availability = signal<VariantAvailability[]>([]);
  protected readonly selectedColorId = signal<number | null>(null);
  protected readonly selectedSizeId = signal<number | null>(null);
  protected readonly scheduledFor = signal('');
  protected readonly reserving = signal(false);
  protected openReservation = false;

  protected readonly imageUrl = productImageUrl;
  protected readonly manualImage = signal<string | null>(null);

  protected readonly galleryImage = computed(() => {
    const manual = this.manualImage();
    if (manual) return manual;

    const p = this.product();
    const colorId = this.selectedColorId();
    if (!p?.images.length) return null;

    if (colorId) {
      const byColor = p.images.find((i) => i.color === colorId);
      if (byColor) return productImageUrl(byColor);
    }

    const primary = p.images.find((i) => i.is_primary) ?? p.images[0];
    return primary ? productImageUrl(primary) : null;
  });

  protected readonly colors = computed(() => {
    const product = this.product();
    const avail = this.availability();
    if (!product) return [];

    const colorMap = new Map<number, { id: number; name: string; hex: string; available: boolean }>();
    for (const v of product.variants.filter((x) => x.is_active)) {
      const a = avail.find((x) => x.variant_id === v.id);
      const branchAvail = this.getBranchAvailable(a);
      const existing = colorMap.get(v.color);
      const available = branchAvail > 0;
      if (!existing) {
        colorMap.set(v.color, {
          id: v.color,
          name: v.color_name,
          hex: v.color_hex,
          available,
        });
      } else if (available) {
        existing.available = true;
      }
    }
    return [...colorMap.values()];
  });

  protected readonly sizes = computed(() => {
    const product = this.product();
    const colorId = this.selectedColorId();
    const avail = this.availability();
    if (!product || !colorId) return [];

    return product.variants
      .filter((v) => v.is_active && v.color === colorId)
      .map((v) => {
        const a = avail.find((x) => x.variant_id === v.id);
        return {
          id: v.size,
          name: v.size_name,
          available: this.getBranchAvailable(a) > 0,
        };
      });
  });

  protected readonly selectedVariant = computed((): ProductVariant | null => {
    const product = this.product();
    const colorId = this.selectedColorId();
    const sizeId = this.selectedSizeId();
    if (!product || !colorId || !sizeId) return null;
    return (
      product.variants.find((v) => v.color === colorId && v.size === sizeId && v.is_active) ??
      null
    );
  });

  protected readonly selectedPrice = computed(
    () => this.selectedVariant()?.effective_price ?? this.product()?.base_price ?? '0',
  );

  protected readonly availableQty = computed(() => {
    const variant = this.selectedVariant();
    if (!variant) return 0;
    const a = this.availability().find((x) => x.variant_id === variant.id);
    return this.getBranchAvailable(a);
  });

  constructor() {
    effect(() => {
      const branchId = this.branchContext.selectedBranchId();
      const product = this.product();
      if (branchId && product) void this.loadAvailability(product.id);
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) void this.loadProduct(id);
    });
  }

  selectColor(id: number): void {
    this.selectedColorId.set(id);
    this.selectedSizeId.set(null);
    this.manualImage.set(null);
  }

  selectGalleryImage(img: ProductImage): void {
    this.manualImage.set(productImageUrl(img));
  }

  selectSize(id: number): void {
    this.selectedSizeId.set(id);
  }

  canAddToCart(): boolean {
    return !!this.selectedVariant() && this.availableQty() > 0 && this.auth.isCustomer();
  }

  canReserve(): boolean {
    return this.canAddToCart();
  }

  async addToCart(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    const variant = this.selectedVariant();
    if (!variant) return;

    try {
      await this.cartStore.addItem(variant.id);
      this.notifications.success('Agregado al carrito');
    } catch {
      // error interceptor handles toast
    }
  }

  onScheduleChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.scheduledFor.set(value ? new Date(value).toISOString() : '');
  }

  async createReservation(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/auth/login']);
      return;
    }

    const variant = this.selectedVariant();
    const branchId = this.branchContext.selectedBranchId();
    const scheduled = this.scheduledFor();

    if (!variant || !branchId || !scheduled) {
      this.notifications.warn('Selecciona fecha y hora para la reserva');
      return;
    }

    this.reserving.set(true);
    try {
      const res = await firstValueFrom(
        this.reservationsApi.create({
          branch_id: branchId,
          scheduled_for: scheduled,
          items: [{ variant_id: variant.id, quantity: 1 }],
        }),
      );
      this.notifications.success(`Reserva ${res.reservation.code} creada`);
      this.openReservation = false;
      await this.router.navigate(['/ecommerce/cuenta/reservas']);
    } finally {
      this.reserving.set(false);
    }
  }

  private async loadProduct(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const product = await firstValueFrom(this.catalogApi.getProduct(id));
      this.product.set(product);
      const firstColor = this.colors()[0];
      if (firstColor) this.selectedColorId.set(firstColor.id);
      await this.loadAvailability(product.id);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAvailability(productId: number): Promise<void> {
    const branchId = this.branchContext.selectedBranchId() ?? undefined;
    const data = await firstValueFrom(this.catalogApi.getAvailability(productId, branchId));
    this.availability.set(data.variants);
  }

  private getBranchAvailable(a?: VariantAvailability): number {
    if (!a) return 0;
    const branchId = this.branchContext.selectedBranchId();
    if (branchId) {
      const branch = a.branches.find((b) => b.branch_id === branchId);
      return branch?.available ?? 0;
    }
    return a.total_available;
  }
}
