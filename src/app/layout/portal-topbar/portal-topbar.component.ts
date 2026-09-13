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
        <div class="user-block">
          <span class="user-block__name">{{ user.first_name }} {{ user.last_name }}</span>
          <span class="role">{{ roleLabel(user.role) }}</span>
        </div>
      }
      <button type="button" class="btn btn--ghost" (click)="auth.logout()">Salir</button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
      min-width: 0;
    }
    .topbar__info {
      color: var(--color-muted);
      font-size: 0.875rem;
      min-width: 0;
    }
    .topbar__user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      margin-left: auto;
      flex-shrink: 0;
    }
    .user-block {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .user-block__name { font-weight: 600; color: var(--color-text); }
    .role {
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-sm);
      background: var(--color-ink);
      color: #fff;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    @media (max-width: 640px) {
      .user-block__name { display: none; }
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
