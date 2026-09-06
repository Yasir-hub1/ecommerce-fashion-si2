import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { openPosReceiptPdf, PosApi } from '../../../../core/api/pos.api';
import { ReservationsApi } from '../../../../core/api/reservations.api';
import { NotificationService } from '../../../../core/services/notification.service';
import { PosBranchService } from '../../../../core/services/pos-branch.service';
import type { ReservationDetail, ReservationListItem } from '../../../../core/models/api.models';
import type { PosPaymentInput, PosQuote, PosSearchResult } from '../../../../core/models/pos.models';
import { PosSubnavComponent } from '../../components/pos-subnav/pos-subnav.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

interface PosLine {
  variantId: number;
  productName: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: string;
  stockAvailable: number;
  reservationItemId?: number;
  maxQty?: number;
}

@Component({
  selector: 'app-pos-sale-page',
  standalone: true,
  imports: [FormsModule, PricePipe, PosSubnavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pos-subnav />
    <div class="pos">
      <header>
        <h1>Caja · POS</h1>
        <p class="hint">Enter busca · F2 cobra · Escanea código de barras</p>
        @if (hasBranch()) {
          <p class="branch-tag">Sucursal activa: {{ branchLabel() }}</p>
        } @else {
          <p class="warn branch-tag">Selecciona una sucursal arriba para buscar productos y reservas.</p>
        }
      </header>

      <div class="pos__grid">
        <section class="search-panel">
          <div class="search-combobox">
            <input
              #searchInput
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="pos-search-listbox"
              [attr.aria-expanded]="suggestOpen()"
              placeholder="Código de barras, SKU o nombre…"
              [(ngModel)]="query"
              (ngModelChange)="onQueryChange($event)"
              (keydown.enter)="onSearchEnter($event)"
              (keydown.arrowDown)="onArrowDown($event)"
              (keydown.arrowUp)="onArrowUp($event)"
              (keydown.escape)="closeSuggestions()"
              (focus)="onSearchFocus()"
              (blur)="onSearchBlur()"
              [disabled]="searching() || !hasBranch()"
            />
            @if (suggestOpen()) {
              <ul id="pos-search-listbox" role="listbox" class="suggestions">
                @if (suggestLoading()) {
                  <li class="suggestion suggestion--muted" role="presentation">Buscando…</li>
                } @else if (!suggestions().length) {
                  <li class="suggestion suggestion--muted" role="presentation">Sin resultados</li>
                } @else {
                  @for (item of suggestions(); track item.variant_id; let i = $index) {
                    <li
                      role="option"
                      [id]="'pos-suggest-' + item.variant_id"
                      [attr.aria-selected]="activeIndex() === i"
                      class="suggestion"
                      [class.suggestion--active]="activeIndex() === i"
                      (mousedown)="selectSuggestion(item, $event)"
                    >
                      <strong>{{ item.product_name }}</strong>
                      <span class="suggestion__sku">{{ item.sku }} · {{ item.size }} · {{ item.color }}</span>
                      <span class="suggestion__meta">{{ item.unit_price | price }} · stock {{ item.stock.available }}</span>
                    </li>
                  }
                }
              </ul>
            }
          </div>

          <div class="res-block">
            <label class="res-label">Reserva (código)
              <div class="search-combobox search-combobox--res">
                <input
                  #reservationInput
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="pos-reservation-listbox"
                  [attr.aria-expanded]="resSuggestOpen()"
                  placeholder="RSV-…"
                  [(ngModel)]="reservationCode"
                  (ngModelChange)="onReservationQueryChange($event)"
                  (keydown.enter)="onReservationEnter($event)"
                  (keydown.arrowDown)="onReservationArrowDown($event)"
                  (keydown.arrowUp)="onReservationArrowUp($event)"
                  (keydown.escape)="closeResSuggestions()"
                  (focus)="onReservationFocus()"
                  (blur)="onReservationBlur()"
                  [disabled]="reservationLoading() || !hasBranch()"
                />
                @if (resSuggestOpen()) {
                  <ul id="pos-reservation-listbox" role="listbox" class="suggestions">
                    @if (resSuggestLoading()) {
                      <li class="suggestion suggestion--muted" role="presentation">Buscando…</li>
                    } @else if (!reservationSuggestions().length) {
                      <li class="suggestion suggestion--muted" role="presentation">Sin reservas</li>
                    } @else {
                      @for (r of reservationSuggestions(); track r.id; let i = $index) {
                        <li
                          role="option"
                          [id]="'pos-res-' + r.id"
                          [attr.aria-selected]="resActiveIndex() === i"
                          class="suggestion"
                          [class.suggestion--active]="resActiveIndex() === i"
                          [class.suggestion--ready]="r.status === 'READY' || r.status === 'IN_FITTING'"
                          (mousedown)="selectReservationSuggestion(r, $event)"
                        >
                          <strong>{{ r.code }}</strong>
                          <span class="suggestion__sku">{{ r.customer_name }} · {{ r.status_display }}</span>
                          <span class="suggestion__meta">{{ r.items_count }} ítem(s) · {{ r.branch_name }}</span>
                        </li>
                      }
                    }
                  </ul>
                }
              </div>
            </label>
          </div>

          @if (activeReservation(); as r) {
            <p class="res-info">
              {{ r.code }} · {{ r.customer_name }} · {{ r.status_display }}
              @if (r.status !== 'READY' && r.status !== 'IN_FITTING') {
                <span class="warn"> — no cobrable</span>
              }
            </p>
            @for (item of r.items; track item.id) {
              <button type="button" class="chip" (click)="addFromReservation(item)">
                + {{ item.product_name }} · {{ item.variant.size_name }} ({{ item.quantity }})
              </button>
            }
          }

        </section>

        <section class="sale-panel">
          <h2>Venta actual</h2>
          @if (!lines().length) {
            <p class="empty">Escanea o busca un producto</p>
          } @else {
            @for (line of lines(); track line.variantId) {
              <div class="line" [class.line--warn]="!isLineAvailable(line)">
                <div>
                  <strong>{{ line.productName }}</strong>
                  <p>{{ line.sku }} · {{ line.size }} · {{ line.color }}</p>
                  <p class="stock">Disponible: {{ line.stockAvailable }}</p>
                </div>
                <div class="line__qty">
                  <button type="button" (click)="changeQty(line.variantId, -1)">−</button>
                  <span>{{ line.quantity }}</span>
                  <button type="button" (click)="changeQty(line.variantId, 1)">+</button>
                </div>
                <span>{{ lineSubtotal(line) | price }}</span>
              </div>
            }
          }

          <div class="totals">
            @if (quoting()) {
              <p class="muted">Calculando totales…</p>
            } @else if (quote(); as q) {
              @if (parseAmount(q.tax_total) > 0) {
                <p>Subtotal: {{ q.subtotal | price }}</p>
                <p>Impuestos: {{ q.tax_total | price }}</p>
              }
              <p class="total-due">Total a pagar: <strong>{{ amountDue() | price }}</strong></p>
            } @else if (lines().length) {
              <p class="total-due">Total a pagar: <strong>{{ amountDue() | price }}</strong></p>
            }

            <label>Efectivo recibido
              <input
                type="number"
                step="0.01"
                min="0"
                [ngModel]="cashReceived()"
                (ngModelChange)="onCashReceivedChange($event)"
              />
            </label>

            @if (amountShort() > 0) {
              <p class="warn">Faltan {{ amountShort() | price }}</p>
            } @else if (changeDue() > 0) {
              <p class="change">Vuelto: {{ changeDue() | price }}</p>
            }

            <button
              type="button"
              class="btn btn--primary btn--block"
              [disabled]="!canCheckout()"
              (click)="sell()"
            >
              {{ selling() ? 'Registrando…' : 'Cobrar (F2)' }}
            </button>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .pos { max-width: 1100px; margin: 0 auto; }
    h1 { font-family: var(--font-display); margin: 0; }
    .hint { color: var(--color-muted); font-size: 0.875rem; margin: 0.25rem 0 1rem; }
    .branch-tag { font-size: 0.8125rem; margin: 0 0 1rem; }
    .pos__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .search-panel, .sale-panel { border: 1px solid var(--color-border); border-radius: 0.875rem; padding: 1rem; background: var(--color-surface); }
    input { width: 100%; margin-bottom: 0.5rem; border: 1px solid var(--color-border); border-radius: 0.625rem; padding: 0.75rem; font: inherit; }
    .search-combobox { position: relative; margin-bottom: 0.5rem; }
    .search-combobox input { margin-bottom: 0; }
    .suggestions {
      position: absolute; z-index: 20; top: calc(100% + 0.25rem); left: 0; right: 0;
      margin: 0; padding: 0.25rem 0; list-style: none;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: 0.625rem; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      max-height: 280px; overflow-y: auto;
    }
    .suggestion {
      padding: 0.625rem 0.875rem; cursor: pointer; display: grid; gap: 0.125rem;
    }
    .suggestion--active, .suggestion:not(.suggestion--muted):hover {
      background: color-mix(in srgb, var(--color-accent) 10%, transparent);
    }
    .suggestion--muted { color: var(--color-muted); cursor: default; }
    .suggestion__sku { font-size: 0.8125rem; color: var(--color-muted); }
    .suggestion__meta { font-size: 0.8125rem; font-weight: 500; }
    .res-block { margin-top: 0.75rem; }
    .res-label { display: block; font-size: 0.875rem; }
    .search-combobox--res { margin-top: 0.35rem; }
    .suggestion--ready strong { color: var(--color-accent); }
    .res-info { font-size: 0.8125rem; color: var(--color-muted); margin: 0.5rem 0; }
    .chip { border: 1px solid var(--color-border); background: var(--color-bg); border-radius: 999px; padding: 0.4rem 0.75rem; cursor: pointer; font: inherit; font-size: 0.8125rem; }
    .line { display: grid; grid-template-columns: 1fr auto auto; gap: 0.75rem; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--color-border); }
    .line--warn { background: color-mix(in srgb, #b45309 6%, transparent); border-radius: 0.375rem; padding-inline: 0.25rem; }
    .line p { margin: 0; font-size: 0.8125rem; color: var(--color-muted); }
    .stock { font-size: 0.75rem !important; }
    .line__qty { display: flex; gap: 0.35rem; align-items: center; }
    .line__qty button { width: 1.75rem; height: 1.75rem; border-radius: 0.375rem; border: 1px solid var(--color-border); cursor: pointer; }
    .totals { margin-top: 1rem; display: grid; gap: 0.5rem; }
    .total-due { font-size: 1.0625rem; margin: 0; }
    .warn { color: #b45309; font-size: 0.875rem; margin: 0; }
    .change { color: #047857; font-size: 0.875rem; margin: 0; font-weight: 600; }
    .muted { color: var(--color-muted); font-size: 0.875rem; margin: 0; }
    .empty { color: var(--color-muted); }
    @media (max-width: 900px) { .pos__grid { grid-template-columns: 1fr; } }
  `,
})
export class PosSalePageComponent implements OnInit {
  private readonly posApi = inject(PosApi);
  private readonly reservationsApi = inject(ReservationsApi);
  protected readonly posBranch = inject(PosBranchService);
  private readonly notifications = inject(NotificationService);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private previousBranchId: number | null | undefined;

  private readonly branchChangeEffect = effect(() => {
    const branchId = this.posBranch.effectiveBranchId();
    if (this.previousBranchId !== undefined && branchId !== this.previousBranchId) {
      this.handleBranchChange();
    }
    this.previousBranchId = branchId;
  });

  ngOnInit(): void {
    void this.posBranch.ensureReady();
  }

  protected readonly hasBranch = computed(() => this.posBranch.effectiveBranchId() != null);

  protected readonly branchLabel = computed(() => {
    const id = this.posBranch.effectiveBranchId();
    if (id == null) return '';
    const branch = this.posBranch.branches().find((b) => b.id === id);
    return branch ? `${branch.name} (${branch.code})` : `Sucursal #${id}`;
  });

  private branchId(): number | undefined {
    const id = this.posBranch.effectiveBranchId();
    return id ?? undefined;
  }

  private requireBranch(): number | null {
    const id = this.branchId();
    if (id == null) {
      this.notifications.warn('Selecciona una sucursal para buscar');
      return null;
    }
    return id;
  }

  private handleBranchChange(): void {
    this.closeSuggestions();
    this.closeResSuggestions();
    this.suggestions.set([]);
    this.reservationSuggestions.set([]);
    if (this.lines().length || this.activeReservation()) {
      this.lines.set([]);
      this.quote.set(null);
      this.paymentPreview.set(null);
      this.cashReceived.set(0);
      this.activeReservation.set(null);
      this.activeReservationId = null;
      this.reservationCode = '';
      this.notifications.info('Sucursal cambiada — venta reiniciada');
    }
  }

  protected query = '';
  protected reservationCode = '';

  protected readonly cashReceived = signal(0);
  protected readonly suggestions = signal<PosSearchResult[]>([]);
  protected readonly suggestOpen = signal(false);
  protected readonly suggestLoading = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly reservationSuggestions = signal<ReservationListItem[]>([]);
  protected readonly resSuggestOpen = signal(false);
  protected readonly resSuggestLoading = signal(false);
  protected readonly resActiveIndex = signal(-1);
  protected readonly reservationLoading = signal(false);
  protected readonly lines = signal<PosLine[]>([]);
  protected readonly quote = signal<PosQuote | null>(null);
  protected readonly paymentPreview = signal<import('../../../../core/models/pos.models').PosPaymentPreview | null>(null);
  protected readonly searching = signal(false);
  protected readonly quoting = signal(false);
  protected readonly selling = signal(false);
  protected readonly activeReservation = signal<ReservationDetail | null>(null);

  protected readonly amountDue = computed(() => {
    const q = this.quote();
    if (q) return this.parseAmount(q.grand_total);
    return this.lines().reduce(
      (sum, line) => sum + this.parseAmount(line.unitPrice) * line.quantity,
      0,
    );
  });

  protected readonly amountShort = computed(() => {
    if (!this.lines().length) return 0;
    const short = this.amountDue() - this.cashReceived();
    return short > 0 ? Math.round(short * 100) / 100 : 0;
  });

  protected readonly changeDue = computed(() => {
    const due = this.amountDue();
    const received = this.cashReceived();
    if (received <= due) return 0;

    const preview = this.paymentPreview();
    if (preview && this.parseAmount(preview.payment_summary.total_due) === due) {
      return this.parseAmount(preview.payment_summary.total_change);
    }

    return Math.round((received - due) * 100) / 100;
  });

  protected readonly canCheckout = computed(() => {
    if (!this.lines().length || this.selling() || this.quoting()) return false;
    const q = this.quote();
    if (q?.items.some((i) => !i.available)) return false;
    return this.cashReceived() >= this.amountDue() && this.amountDue() > 0;
  });

  private activeReservationId: number | null = null;
  private paymentPreviewTimer: ReturnType<typeof setTimeout> | null = null;
  private suggestTimer: ReturnType<typeof setTimeout> | null = null;
  private suggestBlurTimer: ReturnType<typeof setTimeout> | null = null;
  private suggestRequestId = 0;
  private resSuggestTimer: ReturnType<typeof setTimeout> | null = null;
  private resSuggestBlurTimer: ReturnType<typeof setTimeout> | null = null;
  private resSuggestRequestId = 0;

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'F2') {
      event.preventDefault();
      void this.sell();
    }
  }

  protected parseAmount(value: string): number {
    return parseFloat(value) || 0;
  }

  protected lineSubtotal(line: PosLine): number {
    return this.parseAmount(line.unitPrice) * line.quantity;
  }

  protected isLineAvailable(line: PosLine): boolean {
    const qItem = this.quote()?.items.find((i) => i.variant_id === line.variantId);
    return qItem?.available ?? line.quantity <= line.stockAvailable;
  }

  onCashReceivedChange(value: number | string): void {
    this.cashReceived.set(Number(value) || 0);
    this.onPaymentChange();
  }

  onQueryChange(value: string): void {
    if (this.suggestTimer) clearTimeout(this.suggestTimer);

    const q = value.trim();
    if (q.length < 2) {
      this.closeSuggestions();
      return;
    }
    if (!this.requireBranch()) {
      this.closeSuggestions();
      return;
    }

    this.suggestOpen.set(true);
    this.suggestLoading.set(true);
    this.suggestTimer = setTimeout(() => void this.fetchSuggestions(q), 250);
  }

  onSearchFocus(): void {
    if (this.suggestBlurTimer) clearTimeout(this.suggestBlurTimer);
    if (this.query.trim().length >= 2) {
      this.suggestOpen.set(true);
    }
  }

  onSearchBlur(): void {
    this.suggestBlurTimer = setTimeout(() => this.closeSuggestions(), 150);
  }

  closeSuggestions(): void {
    this.suggestOpen.set(false);
    this.suggestLoading.set(false);
    this.activeIndex.set(-1);
  }

  onArrowDown(event: Event): void {
    if (!this.suggestOpen() || !this.suggestions().length) return;
    event.preventDefault();
    const next = Math.min(this.activeIndex() + 1, this.suggestions().length - 1);
    this.activeIndex.set(next);
  }

  onArrowUp(event: Event): void {
    if (!this.suggestOpen() || !this.suggestions().length) return;
    event.preventDefault();
    const next = Math.max(this.activeIndex() - 1, 0);
    this.activeIndex.set(next);
  }

  async onSearchEnter(event: Event): Promise<void> {
    event.preventDefault();
    const q = this.query.trim();
    if (!q || !this.requireBranch()) return;

    const highlighted = this.suggestions()[this.activeIndex()];
    if (this.suggestOpen() && highlighted) {
      this.selectSuggestion(highlighted);
      return;
    }

    if (/^\d{8,}$/.test(q)) {
      try {
        const hit = await firstValueFrom(this.posApi.lookup(q, this.branchId()));
        this.selectSuggestion(hit);
        return;
      } catch {
        /* fallback to text search */
      }
    }

    if (this.suggestions().length === 1) {
      this.selectSuggestion(this.suggestions()[0]!);
      return;
    }

    if (this.suggestions().length > 1) {
      this.suggestOpen.set(true);
      this.activeIndex.set(0);
      return;
    }

    await this.search();
  }

  selectSuggestion(item: PosSearchResult, event?: Event): void {
    event?.preventDefault();
    if (this.suggestBlurTimer) clearTimeout(this.suggestBlurTimer);
    this.addFromSearch(item);
    this.query = '';
    this.suggestions.set([]);
    this.closeSuggestions();
    this.searchInput()?.nativeElement.focus();
  }

  private async fetchSuggestions(q: string): Promise<void> {
    const branchId = this.requireBranch();
    if (branchId == null) return;

    const requestId = ++this.suggestRequestId;
    try {
      const res = await firstValueFrom(this.posApi.search(q, 8, branchId));
      if (requestId !== this.suggestRequestId) return;
      this.suggestions.set(res.results);
      this.activeIndex.set(res.results.length ? 0 : -1);
    } catch {
      if (requestId !== this.suggestRequestId) return;
      this.suggestions.set([]);
      this.activeIndex.set(-1);
    } finally {
      if (requestId === this.suggestRequestId) {
        this.suggestLoading.set(false);
      }
    }
  }

  async search(): Promise<void> {
    const q = this.query.trim();
    const branchId = this.requireBranch();
    if (!q || branchId == null) return;

    this.searching.set(true);
    try {
      if (/^\d{8,}$/.test(q)) {
        try {
          const hit = await firstValueFrom(this.posApi.lookup(q, branchId));
          this.selectSuggestion(hit);
          return;
        } catch {
          /* fallback to text search */
        }
      }

      const res = await firstValueFrom(this.posApi.search(q, 12, branchId));
      if (res.count === 1 && res.results[0]) {
        this.selectSuggestion(res.results[0]);
      } else if (res.results.length) {
        this.suggestions.set(res.results);
        this.suggestOpen.set(true);
        this.activeIndex.set(0);
        if (res.count > res.results.length) {
          this.notifications.info(`${res.count} resultados — mostrando ${res.results.length}`);
        }
      } else {
        this.suggestions.set([]);
        this.suggestOpen.set(true);
        this.notifications.warn('Producto no encontrado');
      }
    } catch {
      this.notifications.error('Error al buscar producto');
    } finally {
      this.searching.set(false);
    }
  }

  async loadReservation(): Promise<void> {
    const code = this.reservationCode.trim();
    if (!code || !this.requireBranch()) return;
    await this.applyReservation({ code });
    this.closeResSuggestions();
  }

  onReservationQueryChange(value: string): void {
    if (this.resSuggestTimer) clearTimeout(this.resSuggestTimer);

    const q = value.trim();
    if (q.length < 2) {
      this.closeResSuggestions();
      return;
    }
    if (!this.requireBranch()) {
      this.closeResSuggestions();
      return;
    }

    this.resSuggestOpen.set(true);
    this.resSuggestLoading.set(true);
    this.resSuggestTimer = setTimeout(() => void this.fetchReservationSuggestions(q), 250);
  }

  onReservationFocus(): void {
    if (this.resSuggestBlurTimer) clearTimeout(this.resSuggestBlurTimer);
    if (this.reservationCode.trim().length >= 2) {
      this.resSuggestOpen.set(true);
    }
  }

  onReservationBlur(): void {
    this.resSuggestBlurTimer = setTimeout(() => this.closeResSuggestions(), 150);
  }

  closeResSuggestions(): void {
    this.resSuggestOpen.set(false);
    this.resSuggestLoading.set(false);
    this.resActiveIndex.set(-1);
  }

  onReservationArrowDown(event: Event): void {
    if (!this.resSuggestOpen() || !this.reservationSuggestions().length) return;
    event.preventDefault();
    const next = Math.min(this.resActiveIndex() + 1, this.reservationSuggestions().length - 1);
    this.resActiveIndex.set(next);
  }

  onReservationArrowUp(event: Event): void {
    if (!this.resSuggestOpen() || !this.reservationSuggestions().length) return;
    event.preventDefault();
    const next = Math.max(this.resActiveIndex() - 1, 0);
    this.resActiveIndex.set(next);
  }

  async onReservationEnter(event: Event): Promise<void> {
    event.preventDefault();
    const code = this.reservationCode.trim();
    if (!code || !this.requireBranch()) return;

    const highlighted = this.reservationSuggestions()[this.resActiveIndex()];
    if (this.resSuggestOpen() && highlighted) {
      await this.selectReservationSuggestion(highlighted);
      return;
    }

    if (this.reservationSuggestions().length === 1) {
      await this.selectReservationSuggestion(this.reservationSuggestions()[0]!);
      return;
    }

    if (this.reservationSuggestions().length > 1) {
      this.resSuggestOpen.set(true);
      this.resActiveIndex.set(0);
      return;
    }

    await this.loadReservation();
  }

  async selectReservationSuggestion(item: ReservationListItem, event?: Event): Promise<void> {
    event?.preventDefault();
    if (this.resSuggestBlurTimer) clearTimeout(this.resSuggestBlurTimer);
    this.reservationCode = item.code;
    await this.applyReservation({ id: item.id });
    this.reservationSuggestions.set([]);
    this.closeResSuggestions();
  }

  private async fetchReservationSuggestions(q: string): Promise<void> {
    const branchId = this.requireBranch();
    if (branchId == null) return;

    const requestId = ++this.resSuggestRequestId;
    try {
      const res = await firstValueFrom(
        this.reservationsApi.list({ search: q, branch: branchId, page_size: 8 }),
      );
      if (requestId !== this.resSuggestRequestId) return;
      this.reservationSuggestions.set(res.results.slice(0, 8));
      this.resActiveIndex.set(res.results.length ? 0 : -1);
    } catch {
      if (requestId !== this.resSuggestRequestId) return;
      this.reservationSuggestions.set([]);
      this.resActiveIndex.set(-1);
    } finally {
      if (requestId === this.resSuggestRequestId) {
        this.resSuggestLoading.set(false);
      }
    }
  }

  private async applyReservation(params: { code?: string; id?: number }): Promise<void> {
    this.reservationLoading.set(true);
    try {
      const detail = await firstValueFrom(this.posApi.lookupReservation(params, this.branchId()));
      this.activeReservation.set(detail);
      this.activeReservationId = detail.id;
      this.reservationCode = detail.code;
      if (detail.status !== 'READY' && detail.status !== 'IN_FITTING') {
        this.notifications.warn(`Reserva en estado ${detail.status_display} — no se puede cobrar aún`);
      }
    } catch {
      this.notifications.error('Reserva no encontrada o no disponible');
    } finally {
      this.reservationLoading.set(false);
    }
  }

  addFromReservation(item: ReservationDetail['items'][0]): void {
    this.addLine({
      variantId: item.variant.id,
      productName: item.product_name,
      sku: item.variant.sku,
      size: item.variant.size_name,
      color: item.variant.color_name,
      unitPrice: item.variant.effective_price,
      stockAvailable: item.quantity,
      quantity: item.quantity,
      reservationItemId: item.id,
      maxQty: item.quantity,
    });
  }

  addFromSearch(hit: PosSearchResult): void {
    this.addLine({
      variantId: hit.variant_id,
      productName: hit.product_name,
      sku: hit.sku,
      size: hit.size,
      color: hit.color,
      unitPrice: hit.unit_price,
      stockAvailable: hit.stock.available,
      quantity: 1,
    });
    this.suggestions.set([]);
  }

  addLine(line: PosLine): void {
    this.lines.update((items) => {
      const existing = items.find((i) => i.variantId === line.variantId);
      if (existing) {
        const nextQty = existing.quantity + line.quantity;
        const cap = existing.maxQty ?? existing.stockAvailable;
        if (nextQty > cap) {
          this.notifications.warn(`Stock máximo: ${cap}`);
          return items;
        }
        return items.map((i) =>
          i.variantId === line.variantId ? { ...i, quantity: nextQty } : i,
        );
      }
      return [...items, line];
    });
    this.suggestions.set([]);
    void this.refreshQuote();
  }

  changeQty(variantId: number, delta: number): void {
    this.lines.update((items) => {
      const updated = items
        .map((i) => {
          if (i.variantId !== variantId) return i;
          const next = i.quantity + delta;
          const cap = i.maxQty ?? i.stockAvailable;
          if (next > cap) {
            this.notifications.warn(`Stock máximo: ${cap}`);
            return i;
          }
          return { ...i, quantity: next };
        })
        .filter((i) => i.quantity > 0);
      return updated;
    });
    void this.refreshQuote();
  }

  onPaymentChange(): void {
    if (this.paymentPreviewTimer) clearTimeout(this.paymentPreviewTimer);
    this.paymentPreviewTimer = setTimeout(() => void this.refreshPaymentPreview(), 300);
  }

  private cartPayload(): { variant_id: number; quantity: number }[] {
    return this.lines().map((l) => ({ variant_id: l.variantId, quantity: l.quantity }));
  }

  private buildPayments(): PosPaymentInput[] {
    const due = this.amountDue();
    const received = this.cashReceived();
    if (received <= 0 || due <= 0) return [];

    return [
      {
        method: 'CASH',
        amount: due.toFixed(2),
        received_amount: received.toFixed(2),
      },
    ];
  }

  private async refreshQuote(): Promise<void> {
    const items = this.cartPayload();
    if (!items.length) {
      this.quote.set(null);
      this.paymentPreview.set(null);
      return;
    }
    this.quoting.set(true);
    try {
      const q = await firstValueFrom(this.posApi.quote(items, this.branchId()));
      this.quote.set(q);
      items.forEach((item) => {
        const qItem = q.items.find((i) => i.variant_id === item.variant_id);
        if (qItem && !qItem.available) {
          this.notifications.warn(`${qItem.product_name}: stock insuficiente`);
        }
      });
      void this.refreshPaymentPreview();
    } catch (err: unknown) {
      this.quote.set(null);
      this.notifications.error(this.extractError(err, 'No se pudo cotizar la venta'));
    } finally {
      this.quoting.set(false);
    }
  }

  private async refreshPaymentPreview(): Promise<void> {
    const items = this.cartPayload();
    const payments = this.buildPayments();
    if (!items.length || !payments.length) {
      this.paymentPreview.set(null);
      return;
    }
    try {
      const preview = await firstValueFrom(
        this.posApi.previewPayments(items, payments, this.branchId()),
      );
      this.paymentPreview.set(preview);
    } catch {
      this.paymentPreview.set(null);
    }
  }

  async sell(): Promise<void> {
    if (!this.canCheckout()) return;

    const items = this.cartPayload();
    const payments = this.buildPayments();

    this.selling.set(true);
    try {
      await this.refreshPaymentPreview();
      const res = await firstValueFrom(
        this.posApi.checkout({
          items,
          payments,
          branch_id: this.branchId(),
          ...(this.activeReservationId ? { reservation_id: this.activeReservationId } : {}),
        }),
      );
      const change = this.parseAmount(res.total_change);
      this.notifications.success(
        change > 0
          ? `Venta ${res.order.code} · Vuelto ${change.toFixed(2)}`
          : `Venta ${res.order.code} registrada`,
      );
      openPosReceiptPdf(this.posApi, res.order.id);
      this.resetSale();
    } catch (err: unknown) {
      this.notifications.error(this.extractError(err, 'Error al registrar la venta'));
    } finally {
      this.selling.set(false);
    }
  }

  private resetSale(): void {
    this.lines.set([]);
    this.quote.set(null);
    this.paymentPreview.set(null);
    this.cashReceived.set(0);
    this.query = '';
    this.suggestions.set([]);
    this.closeSuggestions();
    this.reservationSuggestions.set([]);
    this.closeResSuggestions();
    this.activeReservation.set(null);
    this.activeReservationId = null;
    this.reservationCode = '';
  }

  private extractError(err: unknown, fallback: string): string {
    const body = (err as { error?: { detail?: string; code?: string; message?: string } })?.error;
    if (body?.message) return body.message;
    if (body?.detail) return body.detail;
    if (body?.code === 'INSUFFICIENT_STOCK') return 'Stock insuficiente en una o más líneas';
    if (body?.code === 'INSUFFICIENT_PAYMENT') return 'El pago no cubre el total';
    if (body?.code === 'INVALID_RESERVATION_STATUS') return 'La reserva no está lista para cobrar';
    return fallback;
  }
}
