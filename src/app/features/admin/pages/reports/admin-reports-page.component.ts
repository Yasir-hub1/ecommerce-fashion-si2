import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-admin-reports-page',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Reportes</h1>
    <p class="subtitle">Indicadores de ventas, inventario y reservas con IA (próximamente).</p>
    <app-empty-state
      icon="📊"
      title="Módulo en desarrollo"
      description="Aquí se integrarán los dashboards de reportes del backend cuando estén disponibles."
    />
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0; }
    .subtitle { color: var(--color-muted); margin: 0.25rem 0 1.25rem; }
  `,
})
export class AdminReportsPageComponent {}
