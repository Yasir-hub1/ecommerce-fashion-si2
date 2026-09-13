import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
          <a routerLink="/ecommerce" class="brand" aria-label="VETA inicio">
            <span class="brand__mark" aria-hidden="true">
              <span class="brand__stitch"></span>
            </span>
            <span class="brand__text">
              <span class="brand__name">{{ shell.label }}</span>
              <span class="brand__tag">hilo · sucursal · probador</span>
            </span>
          </a>

          <button
            type="button"
            class="menu-toggle"
            [attr.aria-expanded]="menuOpen()"
            aria-controls="store-nav"
            (click)="menuOpen.set(!menuOpen())"
          >
            {{ menuOpen() ? 'Cerrar' : 'Menú' }}
          </button>

          <nav
            id="store-nav"
            class="nav"
            [class.nav--open]="menuOpen()"
            aria-label="Tienda"
          >
            @for (item of nav; track item.path) {
              @if (item.path.includes('cuenta') ? auth.isAuthenticated() && auth.isCustomer() : true) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                  (click)="menuOpen.set(false)"
                >
                  {{ item.label }}
                </a>
              }
            }
          </nav>

          <div class="header__actions">
            @if (branchContext.branches().length) {
              <label class="branch-select">
                <span class="branch-select__label">Sucursal</span>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6h15l-1.5 9h-12L6 6Zm0 0L5 3H2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="9" cy="20" r="1.25" fill="currentColor"/>
                  <circle cx="18" cy="20" r="1.25" fill="currentColor"/>
                </svg>
                @if (cart.count() > 0) {
                  <span class="cart-btn__badge">{{ cart.count() }}</span>
                }
              </a>
            }

            @if (auth.isAuthenticated()) {
              @if (auth.isStaff()) {
                <a routerLink="/admin" class="btn btn--ghost">Operaciones</a>
              }
              @if (auth.isCustomer()) {
                <a routerLink="/ecommerce/cuenta" class="user-chip">{{ auth.user()?.first_name }}</a>
              }
              <button type="button" class="btn btn--ghost" (click)="auth.logout()">Salir</button>
            } @else {
              <a routerLink="/auth/login" class="btn btn--ghost">Entrar</a>
              <a routerLink="/auth/registro" class="btn btn--primary">Crear cuenta</a>
            }
          </div>
        </div>
      </header>

      <main class="main"><router-outlet /></main>

      <footer class="footer">
        <div class="footer__inner">
          <p class="footer__brand">VETA</p>
          <p>Compra online · Reserva en probador · Stock por sucursal</p>
        </div>
      </footer>
    </div>
  `,
  styles: `
    .shell { min-height: 100dvh; display: flex; flex-direction: column; }

    .header {
      position: sticky; top: 0; z-index: 50;
      backdrop-filter: blur(14px);
      background: color-mix(in srgb, var(--color-surface) 88%, transparent);
      border-bottom: 1px solid var(--color-border);
    }
    .header__inner {
      max-width: 1180px; margin: 0 auto; padding: 0.85rem 1.25rem;
      display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    }

    .brand {
      display: flex; align-items: center; gap: 0.7rem;
      text-decoration: none; color: inherit;
    }
    .brand__mark {
      width: 2.4rem; height: 2.4rem;
      background: var(--color-ink);
      display: grid; place-items: center;
      position: relative;
      clip-path: polygon(0 0, 100% 0, 100% 72%, 72% 100%, 0 100%);
    }
    .brand__stitch {
      width: 1.1rem; height: 1.1rem;
      border: 2px solid var(--color-accent);
      border-radius: 1px;
      transform: rotate(12deg);
    }
    .brand__text { display: grid; line-height: 1.1; }
    .brand__name {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.35rem;
      letter-spacing: -0.04em;
    }
    .brand__tag {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--color-muted);
    }

    .menu-toggle {
      display: none;
      margin-left: auto;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      padding: 0.45rem 0.75rem;
      border-radius: var(--radius-sm);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
    }

    .nav { display: flex; gap: 0.25rem 1.1rem; flex: 1; flex-wrap: wrap; }
    .nav a {
      text-decoration: none;
      color: var(--color-muted);
      font-size: 0.9rem;
      font-weight: 500;
      padding: 0.35rem 0;
      border-bottom: 2px solid transparent;
      transition: color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
    }
    .nav a.active, .nav a:hover {
      color: var(--color-text);
      border-bottom-color: var(--color-accent);
    }

    .header__actions {
      display: flex; align-items: center; gap: 0.5rem;
      margin-left: auto; flex-wrap: wrap;
    }

    .branch-select {
      display: grid; gap: 0.15rem;
    }
    .branch-select__label {
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-muted);
      font-weight: 600;
    }
    .branch-select select {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 0.4rem 0.7rem;
      background: var(--color-surface);
      font-size: 0.8125rem;
      max-width: 14rem;
      font: inherit;
    }

    .cart-btn {
      position: relative;
      text-decoration: none;
      width: 2.35rem; height: 2.35rem;
      display: grid; place-items: center;
      border-radius: var(--radius-sm);
      background: var(--color-ink);
      color: #fff;
      transition: transform var(--duration-fast) var(--ease-out);
    }
    .cart-btn:hover { transform: translateY(-1px); }
    .cart-btn__badge {
      position: absolute; top: -0.35rem; right: -0.35rem;
      min-width: 1.15rem; height: 1.15rem; border-radius: 999px;
      background: var(--color-accent); color: white;
      font-size: 0.625rem;
      display: grid; place-items: center; font-weight: 700;
      border: 2px solid var(--color-surface);
    }

    .user-chip {
      padding: 0.4rem 0.75rem;
      border-radius: var(--radius-sm);
      background: var(--color-surface-2);
      text-decoration: none;
      color: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .main {
      flex: 1;
      max-width: 1180px;
      width: 100%;
      margin: 0 auto;
      padding: 1.75rem 1.25rem 3.5rem;
    }

    .footer {
      border-top: 1px solid var(--color-border);
      padding: 1.5rem 1.25rem;
      background: var(--color-ink);
      color: color-mix(in srgb, white 72%, transparent);
    }
    .footer__inner {
      max-width: 1180px; margin: 0 auto;
      display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
      align-items: baseline;
      font-size: 0.8125rem;
    }
    .footer__brand {
      margin: 0;
      font-family: var(--font-display);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #fff;
      font-size: 1rem;
    }
    .footer p { margin: 0; }

    @media (max-width: 860px) {
      .menu-toggle { display: inline-flex; }
      .nav {
        display: none;
        width: 100%;
        order: 4;
        flex-direction: column;
        gap: 0;
        padding-top: 0.5rem;
        border-top: 1px solid var(--color-border);
      }
      .nav--open { display: flex; }
      .nav a { padding: 0.7rem 0; border-bottom: 1px solid var(--color-border); }
      .nav a.active { border-bottom-color: var(--color-accent); }
      .header__actions { width: 100%; }
    }
  `,
})
export class EcommerceShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly branchContext = inject(BranchContextService);
  protected readonly cart = inject(CartStore);
  protected readonly nav = ECOMMERCE_NAV;
  protected readonly shell = ECOMMERCE_SHELL;
  protected readonly menuOpen = signal(false);

  onBranchChange(event: Event): void {
    this.branchContext.selectBranch(Number((event.target as HTMLSelectElement).value));
  }
}
