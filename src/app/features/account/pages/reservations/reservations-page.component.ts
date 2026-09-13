import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { ReservationsApi } from '../../../../core/api/reservations.api';
import type { ReservationListItem } from '../../../../core/models/api.models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LIST_ROW_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-reservations-page',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Mis reservas</h1>
    @if (loading()) {
      <p>Cargando…</p>
    } @else if (!reservations().length) {
      <app-empty-state
        icon="📅"
        title="Sin reservas"
        description="Reserva prendas desde el detalle de producto para probarlas en sucursal."
      />
    } @else {
      @for (r of reservations(); track r.id) {
        <article class="row">
          <div>
            <strong>{{ r.code }}</strong>
            <p class="meta">{{ r.branch_name }} · {{ formatDate(r.scheduled_for) }}</p>
            <p class="expire">Vence: {{ formatDate(r.expires_at) }}</p>
          </div>
          <div class="right">
            <span class="status">{{ r.status_display }}</span>
            @if (r.status === 'PENDING' || r.status === 'PREPARING') {
              <button type="button" class="btn btn--ghost" (click)="cancel(r.id)">Cancelar</button>
            }
          </div>
        </article>
      }
    }
  `,
  styles: LIST_ROW_STYLES,
})
export class ReservationsPageComponent implements OnInit {
  private readonly reservationsApi = inject(ReservationsApi);

  protected readonly loading = signal(true);
  protected readonly reservations = signal<ReservationListItem[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  formatDate(value: string): string {
    return format(new Date(value), 'd MMM yyyy HH:mm', { locale: es });
  }

  async cancel(id: number): Promise<void> {
    await firstValueFrom(this.reservationsApi.cancel(id));
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.reservationsApi.myReservations());
      this.reservations.set(res.results);
    } finally {
      this.loading.set(false);
    }
  }
}
