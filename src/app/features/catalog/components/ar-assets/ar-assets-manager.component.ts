import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, lastValueFrom, tap } from 'rxjs';

import { ArAssetsApi, type ArAsset } from '../../../../core/api/ar-assets.api';
import type { Color } from '../../../../core/models/admin.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-ar-assets-manager',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="images-section" aria-labelledby="ar-heading">
      <header class="section-header">
        <div>
          <h2 id="ar-heading">Probador virtual (AR)</h2>
          <p class="hint">
            Sube la foto de la prenda. El recorte corre en segundo plano; luego calibra
            escala y desplazamiento sin recompilar la app móvil.
          </p>
        </div>
        @if (canManage()) {
          <button type="button" class="btn btn--primary" (click)="openUpload()">Subir overlay</button>
        }
      </header>

      @if (loading()) {
        <p class="muted">Cargando assets AR…</p>
      } @else if (!assets().length) {
        <p class="empty">Sin overlay — el móvil caerá a modo galería hasta que subas uno.</p>
      } @else {
        <ul class="grid" role="list">
          @for (asset of assets(); track asset.id) {
            <li class="card">
              <div class="thumb">
                @if (previewOf(asset); as url) {
                  <img [src]="url" [alt]="'Overlay ' + (colorName(asset.color) || 'general')" />
                } @else {
                  <span class="placeholder">Sin PNG aún</span>
                }
              </div>
              <div class="card__meta">
                <span class="badge" [class.badge--ready]="asset.status === 'READY'"
                  [class.badge--busy]="asset.status === 'PENDING' || asset.status === 'PROCESSING'"
                  [class.badge--fail]="asset.status === 'FAILED'">{{ statusLabel(asset.status) }}</span>
                @if (asset.color) { <span class="badge">{{ colorName(asset.color) }}</span> }
                @else { <span class="badge">Todos los colores</span> }
              </div>
              @if (asset.error_message || asset.process_error) {
                <p class="error">{{ asset.error_message || asset.process_error }}</p>
              }
              @if (canManage()) {
                <div class="card__actions">
                  @if (asset.status === 'READY') {
                    <button type="button" class="btn btn--ghost" (click)="openCalibrate(asset)">Calibrar</button>
                  }
                  @if (asset.status === 'PENDING' || asset.status === 'FAILED') {
                    <button type="button" class="btn btn--ghost" (click)="retry(asset)">Reintentar</button>
                  }
                  <button type="button" class="btn btn--ghost danger" (click)="remove(asset)">Eliminar</button>
                </div>
              }
            </li>
          }
        </ul>
      }
    </section>

    @if (uploadOpen()) {
      <div class="modal-backdrop" (click)="closeUpload()">
        <div class="modal" role="dialog" (click)="$event.stopPropagation()">
          <h2>Subir overlay 2D</h2>
          <p class="hint">JPG o PNG de catálogo. Mínimo 512 px de ancho. El fondo se recorta en cola.</p>
          <label>Color
            <select [(ngModel)]="uploadColor">
              <option [ngValue]="null">Todos los colores</option>
              @for (c of colors(); track c.id) {
                <option [ngValue]="c.id">{{ c.name }}</option>
              }
            </select>
          </label>
          <label class="file-label">
            Imagen
            <input type="file" accept="image/jpeg,image/png,image/webp" (change)="onFile($event)" />
          </label>
          @if (uploadPreview()) {
            <img class="preview" [src]="uploadPreview()!" alt="Vista previa" />
          }
          @if (uploadProgress() > 0) {
            <p class="muted">Subiendo {{ uploadProgress() }}%</p>
          }
          <div class="modal-actions">
            <button type="button" class="btn btn--ghost" (click)="closeUpload()">Cancelar</button>
            <button type="button" class="btn btn--primary" [disabled]="uploading() || !pendingFile()" (click)="submitUpload()">
              {{ uploading() ? 'Encolando…' : 'Subir y procesar' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (calibrate(); as asset) {
      <div class="modal-backdrop" (click)="closeCalibrate()">
        <div class="modal wide" role="dialog" (click)="$event.stopPropagation()">
          <h2>Calibrar overlay</h2>
          <p class="hint">Ajusta el factor de ancho y el desplazamiento vertical sobre la silueta de referencia.</p>
          <div class="calibrate-grid">
            <div class="silhouette" [style.--wf]="widthFactor()" [style.--oy]="offsetY()">
              @if (previewOf(asset); as url) {
                <img [src]="url" alt="Prenda recortada" />
              }
            </div>
            <div class="sliders">
              <label>Ancho ({{ widthFactor() | number:'1.2-2' }})
                <input type="range" min="0.6" max="2.4" step="0.02" [ngModel]="widthFactor()" (ngModelChange)="widthFactor.set($event)" />
              </label>
              <label>Offset vertical ({{ offsetY() | number:'1.2-2' }})
                <input type="range" min="-0.4" max="0.4" step="0.01" [ngModel]="offsetY()" (ngModelChange)="offsetY.set($event)" />
              </label>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn--ghost" (click)="closeCalibrate()">Cancelar</button>
            <button type="button" class="btn btn--primary" [disabled]="savingCal()" (click)="saveCalibration()">Guardar calibración</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    ADMIN_CRUD_STYLES,
    `
      .images-section { margin: 1.5rem 0; }
      .section-header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 0.75rem; }
      .hint, .muted { color: var(--color-muted); font-size: 0.875rem; margin: 0.25rem 0 0; }
      .empty { color: var(--color-muted); }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; list-style: none; padding: 0; }
      .card { border: 1px solid var(--color-border); border-radius: 0.875rem; padding: 0.75rem; background: var(--color-surface); }
      .thumb { aspect-ratio: 3/4; background: #111; border-radius: 0.5rem; overflow: hidden; display: grid; place-items: center; }
      .thumb img, .preview { width: 100%; height: 100%; object-fit: contain; }
      .preview { height: 180px; object-fit: contain; background: #111; border-radius: 0.5rem; }
      .placeholder { color: #aaa; font-size: 0.75rem; }
      .card__meta { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.5rem 0; }
      .card__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
      .badge--ready { background: #dcfce7; }
      .badge--busy { background: #fef9c3; }
      .badge--fail { background: #fee2e2; }
      .error { color: #b91c1c; font-size: 0.75rem; }
      .calibrate-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      .silhouette { position: relative; min-height: 280px; background:
        linear-gradient(#222, #222) center / 42% 78% no-repeat,
        #0f0f0f; border-radius: 0.75rem; overflow: hidden; }
      .silhouette img {
        position: absolute; inset: 8%;
        width: calc(100% * var(--wf, 1));
        left: 50%; transform: translate(-50%, calc(var(--oy, 0) * 80px));
        object-fit: contain; max-height: 84%;
      }
      .sliders { display: grid; gap: 1rem; align-content: start; }
      @media (max-width: 720px) { .calibrate-grid { grid-template-columns: 1fr; } }
    `,
  ],
})
export class ArAssetsManagerComponent {
  private readonly api = inject(ArAssetsApi);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly productId = input.required<number>();
  readonly canManage = input(false);
  readonly colors = input<Color[]>([]);

  protected readonly loading = signal(true);
  protected readonly assets = signal<ArAsset[]>([]);
  protected readonly uploadOpen = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploadProgress = signal(0);
  protected readonly pendingFile = signal<File | null>(null);
  protected readonly uploadPreview = signal<string | null>(null);
  protected readonly calibrate = signal<ArAsset | null>(null);
  protected readonly widthFactor = signal(1);
  protected readonly offsetY = signal(-0.02);
  protected readonly savingCal = signal(false);
  protected uploadColor: number | null = null;

  constructor() {
    effect(() => {
      const id = this.productId();
      if (id) void this.load(id);
    });
  }

  colorName(colorId: number | null): string {
    if (!colorId) return '';
    return this.colors().find((c) => c.id === colorId)?.name ?? `#${colorId}`;
  }

  statusLabel(status: ArAsset['status']): string {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'PROCESSING':
        return 'Procesando';
      case 'READY':
        return 'Listo';
      default:
        return 'Falló';
    }
  }

  previewOf(asset: ArAsset): string | null {
    return asset.file_url || asset.source_image_url || null;
  }

  openUpload(): void {
    this.uploadColor = this.colors()[0]?.id ?? null;
    this.pendingFile.set(null);
    this.revokePreview();
    this.uploadProgress.set(0);
    this.uploadOpen.set(true);
  }

  closeUpload(): void {
    this.uploadOpen.set(false);
    this.revokePreview();
    this.pendingFile.set(null);
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.pendingFile.set(file);
    this.revokePreview();
    if (file) this.uploadPreview.set(URL.createObjectURL(file));
  }

  async submitUpload(): Promise<void> {
    const file = this.pendingFile();
    if (!file || !this.canManage()) return;
    this.uploading.set(true);
    try {
      const result = await lastValueFrom(
        this.api.upload(this.productId(), file, this.uploadColor).pipe(
          tap((event) => this.uploadProgress.set(event.progress)),
        ),
      );
      const asset = result.asset;
      this.notifications.success('Imagen en cola. El recorte tarda unos segundos.');
      this.closeUpload();
      await this.load(this.productId());
      if (asset) this.watch(asset.id);
    } catch {
      this.notifications.error('No se pudo subir el overlay');
    } finally {
      this.uploading.set(false);
    }
  }

  openCalibrate(asset: ArAsset): void {
    this.calibrate.set(asset);
    this.widthFactor.set(asset.anchor_config?.width_factor ?? 1);
    this.offsetY.set(asset.anchor_config?.offset_y ?? -0.02);
  }

  closeCalibrate(): void {
    this.calibrate.set(null);
  }

  async saveCalibration(): Promise<void> {
    const asset = this.calibrate();
    if (!asset) return;
    this.savingCal.set(true);
    try {
      await firstValueFrom(
        this.api.update(asset.id, {
          anchor_config: {
            ...asset.anchor_config,
            width_factor: this.widthFactor(),
            offset_y: this.offsetY(),
            auto_calibrated: false,
          },
        }),
      );
      this.notifications.success('Calibración guardada. La app móvil la usa al abrir el probador.');
      this.closeCalibrate();
      await this.load(this.productId());
    } catch {
      this.notifications.error('No se pudo guardar la calibración');
    } finally {
      this.savingCal.set(false);
    }
  }

  async retry(asset: ArAsset): Promise<void> {
    try {
      await firstValueFrom(this.api.retry(asset.id));
      this.notifications.info('Procesamiento reencolado');
      this.watch(asset.id);
    } catch {
      this.notifications.error('No se pudo reintentar. ¿Está Celery encendido?');
    }
  }

  async remove(asset: ArAsset): Promise<void> {
    if (!confirm('¿Eliminar este overlay AR?')) return;
    try {
      await firstValueFrom(this.api.delete(asset.id));
      this.notifications.info('Asset eliminado');
      await this.load(this.productId());
    } catch {
      this.notifications.error('No se pudo eliminar');
    }
  }

  private watch(id: number): void {
    this.api
      .pollUntilSettled(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (asset) => {
          this.assets.update((list) => list.map((item) => (item.id === asset.id ? asset : item)));
        },
        complete: () => void this.load(this.productId()),
      });
  }

  private async load(productId: number): Promise<void> {
    this.loading.set(true);
    try {
      const list = await firstValueFrom(this.api.listByProduct(productId));
      this.assets.set(list);
      for (const asset of list) {
        if (asset.status === 'PENDING' || asset.status === 'PROCESSING') {
          this.watch(asset.id);
        }
      }
    } finally {
      this.loading.set(false);
    }
  }

  private revokePreview(): void {
    const current = this.uploadPreview();
    if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
    this.uploadPreview.set(null);
  }
}
