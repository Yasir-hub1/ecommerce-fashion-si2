import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { ReservationsApi } from '../../../../core/api/reservations.api';
import { NotificationService } from '../../../../core/services/notification.service';
import type { ReservationListItem } from '../../../../core/models/api.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'IN_FITTING',
  IN_FITTING: 'COMPLETED',
};

@Component({
  selector: 'app-reservations-panel-page',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Reservas del día</h1>
    <p class="subtitle">Panel del encargado · próximas reservas de tu sucursal</p>

    @if (loading()) {
      <p>Cargando reservas…</p>
    } @else if (!reservations().length) {
      <app-empty-state icon="📋" title="Sin reservas próximas" description="Las nuevas reservas aparecerán aquí." />
    } @else {
      @for (r of reservations(); track r.id) {
        <article class="card">
          <header>
            <strong>{{ r.code }}</strong>
            <span class="badge">{{ r.status_display }}</span>
          </header>
          <p>{{ r.customer_name }} · {{ r.items_count }} prenda(s)</p>
          <p class="time">{{ formatDate(r.scheduled_for) }}</p>
          <p class="expire">Expira: {{ formatDate(r.expires_at) }}</p>
          <div class="actions">
            @if (nextStatus(r.status); as next) {
              <button type="button" class="btn btn--primary" (click)="transition(r.id, next)">
                Marcar como {{ statusLabel(next) }}
              </button>
            }
            <button type="button" class="btn btn--ghost" (click)="cancel(r.id)">Cancelar</button>
          </div>
        </article>
      }
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0; }
    .subtitle { color: var(--color-muted); margin: 0 0 1.25rem; }
    .card {
      padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.875rem;
      background: var(--color-surface); margin-bottom: 0.75rem;
    }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 999px; background: var(--color-surface-2); }
    .time { margin: 0.25rem 0; font-weight: 600; }
    .expire { color: #b45309; font-size: 0.8125rem; margin: 0 0 0.75rem; }
    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  `,
})
export class ReservationsPanelPageComponent implements OnInit {
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly notifications = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly reservations = signal<ReservationListItem[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  formatDate(value: string): string {
    return format(new Date(value), 'd MMM yyyy HH:mm', { locale: es });
  }

  nextStatus(status: string): string | null {
    return NEXT_STATUS[status] ?? null;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PREPARING: 'Preparando',
      READY: 'Lista',
      IN_FITTING: 'En probador',
      COMPLETED: 'Completada',
    };
    return labels[status] ?? status;
  }

  async transition(id: number, status: string): Promise<void> {
    await firstValueFrom(this.reservationsApi.transition(id, status));
    this.notifications.success('Estado actualizado');
    await this.load();
  }

  async cancel(id: number): Promise<void> {
    await firstValueFrom(this.reservationsApi.cancel(id));
    this.notifications.info('Reserva cancelada');
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.reservationsApi.upcoming());
      this.reservations.set(res.results);
    } finally {
      this.loading.set(false);
    }
  }
}
