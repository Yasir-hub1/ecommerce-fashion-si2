import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { ReservationsApi } from '../../../../core/api/reservations.api';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import type { ReservationListItem } from '../../../../core/models/api.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LIST_ROW_STYLES } from '../../../../shared/styles/admin-crud.styles';

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'IN_FITTING',
  IN_FITTING: 'COMPLETED',
};

@Component({
  selector: 'app-admin-reservations-page',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Reservas</h1>
    <p class="subtitle">Gestión de reservas de probador en todas las sucursales.</p>

    @if (loading()) {
      <p>Cargando…</p>
    } @else if (!items().length) {
      <app-empty-state icon="📅" title="Sin reservas" description="Las reservas de probador aparecerán aquí." />
    } @else {
      @for (r of items(); track r.id) {
        <article class="row">
          <div>
            <strong>{{ r.code }}</strong>
            <p>{{ r.customer_name }} · {{ r.branch_name }} · {{ r.items_count }} prenda(s)</p>
            <p class="time">{{ fmt(r.scheduled_for) }}</p>
          </div>
          <div class="right">
            <span class="badge">{{ r.status_display }}</span>
            @if (canManage()) {
              <div class="actions">
                @if (nextStatus(r.status); as next) {
                  <button type="button" class="btn btn--primary" (click)="transition(r.id, next)">
                    {{ statusLabel(next) }}
                  </button>
                }
                <button type="button" class="btn btn--ghost" (click)="cancel(r.id)">Cancelar</button>
              </div>
            }
          </div>
        </article>
      }
    }
  `,
  styles: LIST_ROW_STYLES,
})
export class AdminReservationsPageComponent implements OnInit {
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly items = signal<ReservationListItem[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('reservations.manage'));

  ngOnInit(): void { void this.load(); }

  fmt(v: string): string {
    return format(new Date(v), 'd MMM yyyy HH:mm', { locale: es });
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
      const res = await firstValueFrom(this.reservationsApi.list());
      this.items.set(res.results);
    } finally { this.loading.set(false); }
  }
}
