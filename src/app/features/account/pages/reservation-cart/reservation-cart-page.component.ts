import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ReservationsApi } from '../../../../core/api/reservations.api';
import { BranchContextService } from '../../../../core/services/branch-context.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReservationCartStore } from '../../../../core/services/reservation-cart.store';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-reservation-cart-page',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Reserva de probador</h1>
    <p class="subtitle">
      Sucursal: <strong>{{ branchContext.selectedBranch()?.name ?? '—' }}</strong>
      · {{ reservationCart.totalItems() }} prenda(s)
    </p>

    @if (!reservationCart.lines().length) {
      <app-empty-state icon="👗" title="Sin prendas en la reserva" description="Agrega productos desde el catálogo.">
        <a routerLink="/ecommerce" class="btn btn--primary">Ir al catálogo</a>
      </app-empty-state>
    } @else {
      <div class="layout">
        <div class="items">
          @for (line of reservationCart.lines(); track line.variantId) {
            <article class="row">
              <div>
                <strong>{{ line.productName }}</strong>
                <p>{{ line.sku }} · {{ line.colorName }} · Talla {{ line.sizeName }}</p>
              </div>
              <div class="qty">
                <button type="button" (click)="reservationCart.updateQty(line.variantId, line.quantity - 1)">−</button>
                <span>{{ line.quantity }}</span>
                <button type="button" (click)="reservationCart.updateQty(line.variantId, line.quantity + 1)">+</button>
              </div>
              <button type="button" class="remove" (click)="reservationCart.removeLine(line.variantId)">Quitar</button>
            </article>
          }
        </div>

        <aside class="panel">
          <h2>Agendar visita</h2>
          <label>
            Fecha y hora
            <input type="datetime-local" [value]="scheduleLocal()" (change)="onSchedule($event)" />
          </label>
          <label>
            Notas (opcional)
            <textarea rows="2" [value]="reservationCart.notes()" (input)="onNotes($event)"></textarea>
          </label>
          <button type="button" class="btn btn--primary btn--block" [disabled]="submitting()" (click)="submit()">
            {{ submitting() ? 'Reservando…' : 'Confirmar reserva' }}
          </button>
        </aside>
      </div>
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0; }
    .subtitle { color: var(--color-muted); margin: 0.25rem 0 1.25rem; }
    .layout { display: grid; grid-template-columns: 1fr 18rem; gap: 1.25rem; align-items: start; }
    .row {
      display: grid; grid-template-columns: 1fr auto auto; gap: 0.75rem; align-items: center;
      padding: 0.875rem 1rem; border: 1px solid var(--color-border); border-radius: 0.875rem;
      background: var(--color-surface); margin-bottom: 0.5rem;
    }
    p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--color-muted); }
    .qty { display: flex; gap: 0.35rem; align-items: center; }
    .qty button { width: 1.75rem; height: 1.75rem; border: 1px solid var(--color-border); border-radius: 0.375rem; }
    .remove { border: none; background: none; color: #b91c1c; cursor: pointer; font-size: 0.8125rem; }
    .panel {
      padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.875rem;
      background: var(--color-surface); display: grid; gap: 0.75rem;
    }
    h2 { margin: 0; font-size: 1rem; }
    label { display: grid; gap: 0.35rem; font-size: 0.875rem; font-weight: 500; }
    input, textarea {
      padding: 0.625rem; border: 1px solid var(--color-border); border-radius: 0.625rem; font: inherit;
    }
    @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class ReservationCartPageComponent {
  protected readonly reservationCart = inject(ReservationCartStore);
  protected readonly branchContext = inject(BranchContextService);
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);

  scheduleLocal(): string {
    const iso = this.reservationCart.scheduledFor();
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  onSchedule(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.reservationCart.setSchedule(value ? new Date(value).toISOString() : '');
  }

  onNotes(event: Event): void {
    this.reservationCart.setNotes((event.target as HTMLTextAreaElement).value);
  }

  async submit(): Promise<void> {
    const branchId = this.branchContext.selectedBranchId();
    const scheduled = this.reservationCart.scheduledFor();
    const lines = this.reservationCart.lines();

    if (!branchId || !scheduled || !lines.length) {
      this.notifications.warn('Completa fecha, hora y al menos una prenda');
      return;
    }

    this.submitting.set(true);
    try {
      const res = await firstValueFrom(
        this.reservationsApi.create({
          branch_id: branchId,
          scheduled_for: scheduled,
          notes: this.reservationCart.notes(),
          items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
        }),
      );
      this.reservationCart.clear();
      this.notifications.success(`Reserva ${res.reservation.code} creada`);
      await this.router.navigate(['/ecommerce/cuenta/reservas']);
    } catch {
      this.notifications.error('No se pudo crear la reserva');
    } finally {
      this.submitting.set(false);
    }
  }
}
