import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Mi cuenta</h1>
    @if (auth.profile(); as profile) {
      <div class="card">
        <p><strong>{{ profile.first_name }} {{ profile.last_name }}</strong></p>
        <p>{{ profile.email }}</p>
        <p class="role">Rol: {{ profile.role }}</p>
      </div>
      <nav class="links">
        <a routerLink="/ecommerce/cuenta/pedidos">Mis compras</a>
        <a routerLink="/ecommerce/cuenta/reservas">Mis reservas</a>
      </nav>
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0 0 1rem; }
    .card { padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.875rem; background: var(--color-surface); }
    .role { color: var(--color-muted); font-size: 0.875rem; }
    .links { display: grid; gap: 0.5rem; margin-top: 1rem; }
    .links a { color: var(--color-accent); }
  `,
})
export class ProfilePageComponent {
  protected readonly auth = inject(AuthService);
}
