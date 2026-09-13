import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type {
  Circle,
  CircleMarker,
  LatLngExpression,
  LeafletMouseEvent,
  Map as LeafletMap,
  Marker,
} from 'leaflet';

/** Fallback si el navegador no da geolocalización: Santa Cruz, Bolivia */
const FALLBACK_CENTER: LatLngExpression = [-17.783327, -63.18214];
const USER_ZOOM = 16;
const PIN_ZOOM = 15;

export type MapCoordinates = { latitude: number | null; longitude: number | null };

@Component({
  selector: 'app-map-location-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-picker">
      <div class="map-picker__toolbar">
        <p class="map-picker__hint">
          El mapa se centra en tu ubicación. Haz clic para marcar la sucursal
          (también puedes arrastrar el pin o escribir lat/lng).
        </p>
        <button
          type="button"
          class="btn btn--secondary"
          [disabled]="disabled() || locating()"
          (click)="recenterOnMe()"
        >
          {{ locating() ? 'Ubicando…' : 'Mi ubicación' }}
        </button>
      </div>

      @if (geoMessage()) {
        <p class="map-picker__geo" [class.map-picker__geo--warn]="geoWarn()">{{ geoMessage() }}</p>
      }

      <div class="map-picker__coords">
        <label>
          Latitud
          <input
            type="number"
            step="0.000001"
            min="-90"
            max="90"
            [value]="latitude() ?? ''"
            [disabled]="disabled()"
            (change)="onManualLat($event)"
            placeholder="-17.783327"
          />
        </label>
        <label>
          Longitud
          <input
            type="number"
            step="0.000001"
            min="-180"
            max="180"
            [value]="longitude() ?? ''"
            [disabled]="disabled()"
            (change)="onManualLng($event)"
            placeholder="-63.182140"
          />
        </label>
        @if (latitude() !== null && longitude() !== null) {
          <button type="button" class="btn btn--ghost" [disabled]="disabled()" (click)="clear()">
            Quitar pin
          </button>
        }
      </div>

      <div
        #mapHost
        class="map-picker__canvas"
        role="application"
        aria-label="Mapa para seleccionar coordenadas de la sucursal"
      ></div>

      @if (!ready()) {
        <p class="map-picker__loading">Cargando mapa…</p>
      }
    </div>
  `,
  styles: `
    .map-picker { display: grid; gap: 0.75rem; }
    .map-picker__toolbar {
      display: flex; gap: 0.75rem; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap;
    }
    .map-picker__hint {
      font-size: 0.8125rem; color: var(--color-muted); margin: 0; flex: 1 1 14rem;
    }
    .map-picker__geo {
      margin: 0; font-size: 0.75rem; color: #047857;
    }
    .map-picker__geo--warn { color: #b45309; }
    .map-picker__coords {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 0.5rem;
      align-items: end;
    }
    .map-picker__coords label {
      display: grid; gap: 0.25rem; font-size: 0.8125rem; font-weight: 500;
    }
    .map-picker__coords input {
      border: 1px solid var(--color-border); border-radius: 0.625rem;
      padding: 0.5rem 0.625rem; font: inherit; background: var(--color-bg);
      width: 100%; min-height: 2.5rem;
    }
    .map-picker__canvas {
      height: min(22rem, 50dvh);
      width: 100%;
      border-radius: 0.75rem;
      border: 1px solid var(--color-border);
      z-index: 0;
      background: var(--color-surface-2);
    }
    .map-picker__loading {
      margin: 0; font-size: 0.8125rem; color: var(--color-muted);
    }
    @media (max-width: 640px) {
      .map-picker__coords { grid-template-columns: 1fr; }
      .map-picker__coords .btn,
      .map-picker__toolbar .btn { width: 100%; }
      .map-picker__canvas { height: min(16rem, 45dvh); }
    }
  `,
})
export class MapLocationPickerComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  /** Latitud del pin de sucursal (null = sin pin). */
  readonly latitude = input<number | null>(null);
  /** Longitud del pin de sucursal (null = sin pin). */
  readonly longitude = input<number | null>(null);
  readonly disabled = input(false);

  readonly coordinatesChange = output<MapCoordinates>();

  private readonly mapHost = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  protected readonly ready = signal(false);
  protected readonly locating = signal(false);
  protected readonly geoMessage = signal<string | null>(null);
  protected readonly geoWarn = signal(false);

  private map: LeafletMap | null = null;
  private marker: Marker | null = null;
  private userDot: CircleMarker | null = null;
  private userAccuracy: Circle | null = null;
  private leaflet: typeof import('leaflet') | null = null;
  private syncingFromParent = false;
  private destroyed = false;

  constructor() {
    afterNextRender(() => {
      void this.initMap();
    });

    effect(() => {
      const lat = this.latitude();
      const lng = this.longitude();
      if (!this.map || !this.leaflet) return;
      this.syncingFromParent = true;
      // No forzar fly al pin: el usuario quiere quedarse en su ubicación
      this.syncMarker(lat, lng, /* flyTo */ false);
      this.syncingFromParent = false;
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.map?.remove();
      this.map = null;
      this.marker = null;
      this.userDot = null;
      this.userAccuracy = null;
    });
  }

  protected recenterOnMe(): void {
    void this.focusOnCurrentLocation(/* fly */ true);
  }

  protected onManualLat(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = raw === '' ? null : Number(raw);
    const lat = parsed === null || Number.isNaN(parsed) ? null : clamp(parsed, -90, 90);
    this.coordinatesChange.emit({
      latitude: lat === null ? null : round6(lat),
      longitude: this.longitude(),
    });
  }

  protected onManualLng(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = raw === '' ? null : Number(raw);
    const lng = parsed === null || Number.isNaN(parsed) ? null : clamp(parsed, -180, 180);
    this.coordinatesChange.emit({
      latitude: this.latitude(),
      longitude: lng === null ? null : round6(lng),
    });
  }

  protected clear(): void {
    this.coordinatesChange.emit({ latitude: null, longitude: null });
  }

  private async initMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const L = await import('leaflet');
    this.leaflet = L;

    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const host = this.mapHost().nativeElement;
    const lat = this.latitude();
    const lng = this.longitude();

    this.map = L.map(host, {
      center: FALLBACK_CENTER,
      zoom: USER_ZOOM,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on('click', (e: LeafletMouseEvent) => {
      if (this.disabled()) return;
      this.coordinatesChange.emit({
        latitude: round6(e.latlng.lat),
        longitude: round6(e.latlng.lng),
      });
    });

    this.syncMarker(lat, lng, false);

    requestAnimationFrame(() => {
      this.map?.invalidateSize();
      this.ready.set(true);
    });
    setTimeout(() => this.map?.invalidateSize(), 150);

    // Siempre intentar enfocar la ubicación actual del usuario
    await this.focusOnCurrentLocation(/* fly */ true);
  }

  private focusOnCurrentLocation(fly: boolean): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.map || !this.leaflet) {
      return Promise.resolve();
    }

    if (!navigator.geolocation) {
      this.geoWarn.set(true);
      this.geoMessage.set('Tu navegador no soporta geolocalización. Usa el mapa o escribe las coordenadas.');
      return Promise.resolve();
    }

    this.locating.set(true);
    this.geoWarn.set(false);
    this.geoMessage.set('Obteniendo tu ubicación…');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (this.destroyed || !this.map || !this.leaflet) {
            resolve();
            return;
          }

          const { latitude, longitude, accuracy } = pos.coords;
          const center: LatLngExpression = [latitude, longitude];
          this.drawUserLocation(center, accuracy);

          if (fly) {
            this.map.setView(center, USER_ZOOM);
          }

          this.locating.set(false);
          this.geoWarn.set(false);
          this.geoMessage.set('Centrado en tu ubicación. Haz clic para elegir el punto de la sucursal.');
          resolve();
        },
        (err) => {
          if (this.destroyed) {
            resolve();
            return;
          }
          this.locating.set(false);
          this.geoWarn.set(true);
          this.geoMessage.set(
            err.code === err.PERMISSION_DENIED
              ? 'Permiso de ubicación denegado. Actívalo en el navegador o elige el punto manualmente.'
              : 'No se pudo obtener tu ubicación. Elige el punto en el mapa o escribe las coordenadas.',
          );
          // Si hay pin de sucursal, al menos encuádralo
          const lat = this.latitude();
          const lng = this.longitude();
          if (lat !== null && lng !== null && this.map) {
            this.map.setView([lat, lng], PIN_ZOOM);
          }
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 30_000,
        },
      );
    });
  }

  private drawUserLocation(center: LatLngExpression, accuracyMeters: number): void {
    const L = this.leaflet;
    const map = this.map;
    if (!L || !map) return;

    if (this.userAccuracy) {
      this.userAccuracy.setLatLng(center);
      this.userAccuracy.setRadius(Math.max(accuracyMeters, 20));
    } else {
      this.userAccuracy = L.circle(center, {
        radius: Math.max(accuracyMeters, 20),
        color: '#2563eb',
        weight: 1,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        interactive: false,
      }).addTo(map);
    }

    if (this.userDot) {
      this.userDot.setLatLng(center);
    } else {
      this.userDot = L.circleMarker(center, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
      this.userDot.bindTooltip('Tu ubicación', { direction: 'top', offset: [0, -8] });
    }
  }

  private syncMarker(lat: number | null, lng: number | null, flyTo: boolean): void {
    const L = this.leaflet;
    const map = this.map;
    if (!L || !map) return;

    if (lat === null || lng === null) {
      if (this.marker) {
        map.removeLayer(this.marker);
        this.marker = null;
      }
      return;
    }

    const position: LatLngExpression = [lat, lng];
    if (this.marker) {
      this.marker.setLatLng(position);
    } else {
      this.marker = L.marker(position, { draggable: !this.disabled() }).addTo(map);
      this.marker.on('dragend', () => {
        if (this.syncingFromParent || this.disabled()) return;
        const pos = this.marker!.getLatLng();
        this.coordinatesChange.emit({
          latitude: round6(pos.lat),
          longitude: round6(pos.lng),
        });
      });
    }

    if (flyTo) {
      map.setView(position, Math.max(map.getZoom(), PIN_ZOOM));
    }
  }
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
