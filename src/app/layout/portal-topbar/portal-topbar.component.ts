import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-portal-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="topbar__info">
      <ng-content />
    </div>
    <div class="topbar__user">
      @if (auth.user(); as user) {
        <span>{{ user.first_name }} {{ user.last_name }}</span>
        <span class="role">{{ roleLabel(user.role) }}</span>
      }
      <button type="button" class="btn btn--ghost" (click)="auth.logout()">Salir</button>
    </div>
  `,
  styles: `
    :host {
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.75rem; width: 100%; min-width: 0;
    }
    .topbar__info {
      color: var(--color-muted); font-size: 0.875rem; min-width: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .topbar__user {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;
      flex-shrink: 0;
    }
    .topbar__user > span:first-child {
      max-width: 9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .role {
      padding: 0.2rem 0.5rem; border-radius: 999px;
      background: var(--color-surface-2); color: var(--color-muted); font-size: 0.75rem;
    }
    @media (max-width: 640px) {
      .topbar__info { display: none; }
      .role { display: none; }
      .topbar__user > span:first-child { max-width: 6rem; font-size: 0.8125rem; }
      .btn { padding: 0.45rem 0.7rem; min-height: 2.5rem; }
    }
  `,
})
export class PortalTopbarComponent {
  protected readonly auth = inject(AuthService);

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      CUSTOMER: 'Cliente',
      ADMIN: 'Administrador',
      BRANCH_MANAGER: 'Encargado',
      CASHIER: 'Cajero',
      SUPPLIER: 'Proveedor',
    };
    return labels[role] ?? role;
  }
}
