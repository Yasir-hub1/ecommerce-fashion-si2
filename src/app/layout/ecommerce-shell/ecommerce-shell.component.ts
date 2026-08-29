import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ECOMMERCE_NAV, ECOMMERCE_SHELL } from '../../core/config/admin-nav.config';
import { BranchContextService } from '../../core/services/branch-context.service';
import { CartStore } from '../../core/services/cart.store';

@Component({
  selector: 'app-ecommerce-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <header class="header">
        <div class="header__inner">
          <a routerLink="/ecommerce" class="brand">
            <span class="brand__mark">FS</span>
            <span class="brand__name">{{ shell.label }}</span>
          </a>

          <nav class="nav" aria-label="E-commerce">
            @for (item of nav; track item.path) {
              @if (item.path.includes('cuenta') ? auth.isAuthenticated() && auth.isCustomer() : true) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                >
                  {{ item.label }}
                </a>
              }
            }
          </nav>

          <div class="header__actions">
            @if (branchContext.branches().length) {
              <label class="branch-select">
                <span class="sr-only">Sucursal</span>
                <select
                  [value]="branchContext.selectedBranchId() ?? ''"
                  (change)="onBranchChange($event)"
                >
                  @for (b of branchContext.branches(); track b.id) {
                    <option [value]="b.id">{{ b.name }} · {{ b.city_name }}</option>
                  }
                </select>
              </label>
            }

            @if (auth.isAuthenticated() && auth.isCustomer()) {
              <a routerLink="/ecommerce/carrito" class="cart-btn" aria-label="Carrito">
                🛒
                @if (cart.count() > 0) {
                  <span class="cart-btn__badge">{{ cart.count() }}</span>
                }
              </a>
            }

            @if (auth.isAuthenticated()) {
              @if (auth.isStaff()) {
                <a routerLink="/admin" class="btn btn--ghost">Administración</a>
              }
              @if (auth.isCustomer()) {
                <a routerLink="/ecommerce/cuenta" class="user-chip">{{ auth.user()?.first_name }}</a>
              }
              <button type="button" class="btn btn--ghost" (click)="auth.logout()">Salir</button>
            } @else {
              <a routerLink="/auth/login" class="btn btn--ghost">Entrar</a>
              <a routerLink="/auth/registro" class="btn btn--primary">Registrarse</a>
            }
          </div>
        </div>
      </header>

      <main class="main"><router-outlet /></main>

      <footer class="footer">
        <p>FashionStore · Compra online · Reserva probador · Recomendaciones IA</p>
      </footer>
    </div>
  `,
  styles: `
    .shell { min-height: 100dvh; display: flex; flex-direction: column; }
    .header {
      position: sticky; top: 0; z-index: 50;
      backdrop-filter: blur(12px);
      background: color-mix(in srgb, var(--color-surface) 92%, transparent);
      border-bottom: 1px solid var(--color-border);
    }
    .header__inner {
      max-width: 1200px; margin: 0 auto; padding: 0.875rem 1.25rem;
      display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    }
    .brand { display: flex; align-items: center; gap: 0.625rem; text-decoration: none; color: inherit; }
    .brand__mark {
      width: 2.25rem; height: 2.25rem; border-radius: 999px;
      display: grid; place-items: center; font-weight: 700; font-size: 0.75rem;
      background: var(--color-accent); color: white;
    }
    .brand__name { font-family: var(--font-display); font-size: 1.125rem; }
    .nav { display: flex; gap: 1rem; flex: 1; flex-wrap: wrap; }
    .nav a {
      text-decoration: none; color: var(--color-muted); font-size: 0.9rem;
      padding: 0.25rem 0; border-bottom: 2px solid transparent;
    }
    .nav a.active, .nav a:hover { color: var(--color-text); border-bottom-color: var(--color-accent); }
    .header__actions { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; flex-wrap: wrap; }
    .branch-select select {
      border: 1px solid var(--color-border); border-radius: 999px;
      padding: 0.4rem 0.875rem; background: var(--color-surface); font-size: 0.8125rem; max-width: 14rem;
    }
    .cart-btn {
      position: relative; text-decoration: none; font-size: 1.125rem;
      width: 2.25rem; height: 2.25rem; display: grid; place-items: center;
      border-radius: 999px; background: var(--color-surface-2);
    }
    .cart-btn__badge {
      position: absolute; top: -0.25rem; right: -0.25rem;
      min-width: 1.125rem; height: 1.125rem; border-radius: 999px;
      background: var(--color-accent); color: white; font-size: 0.625rem;
      display: grid; place-items: center; font-weight: 700;
    }
    .user-chip {
      padding: 0.35rem 0.75rem; border-radius: 999px;
      background: var(--color-surface-2); text-decoration: none; color: inherit; font-size: 0.8125rem;
    }
    .main { flex: 1; max-width: 1200px; width: 100%; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
    .footer {
      border-top: 1px solid var(--color-border); padding: 1.25rem;
      text-align: center; color: var(--color-muted); font-size: 0.8125rem;
    }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); border: 0;
    }
  `,
})
export class EcommerceShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly branchContext = inject(BranchContextService);
  protected readonly cart = inject(CartStore);
  protected readonly nav = ECOMMERCE_NAV;
  protected readonly shell = ECOMMERCE_SHELL;

  onBranchChange(event: Event): void {
    this.branchContext.selectBranch(Number((event.target as HTMLSelectElement).value));
  }
}
