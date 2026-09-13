import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import type { AdminNavItem } from '../../core/config/admin-nav.config';

@Component({
  selector: 'app-sidebar-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="portal" [class.nav-open]="navOpen()" [style.--portal-accent]="accent()">
      @if (navOpen()) {
        <button
          type="button"
          class="nav-scrim"
          aria-label="Cerrar menú"
          (click)="closeNav()"
        ></button>
      }

      <aside class="sidebar" id="admin-sidebar">
        <div class="sidebar__brand">
          <span class="sidebar__mark">FS</span>
          <div>
            <p class="sidebar__eyebrow">FashionStore</p>
            <h1 class="sidebar__title">{{ title() }}</h1>
          </div>
          <button
            type="button"
            class="sidebar__close"
            aria-label="Cerrar menú"
            (click)="closeNav()"
          >✕</button>
        </div>

        <nav class="sidebar__nav" aria-label="Navegación del backoffice">
          @for (item of navItems(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              (click)="onNavClick()"
            >
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="sidebar__footer">
          <ng-content select="[sidebar-footer]" />
        </div>
      </aside>

      <div class="portal__main">
        <header class="topbar">
          <button
            type="button"
            class="menu-btn"
            [attr.aria-expanded]="navOpen()"
            aria-controls="admin-sidebar"
            aria-label="Abrir menú"
            (click)="toggleNav()"
          >
            <span class="menu-btn__bars" aria-hidden="true"></span>
          </button>
          <div class="topbar__slot">
            <ng-content select="[topbar]" />
          </div>
        </header>
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .portal {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: 16rem 1fr;
      background: var(--color-bg);
    }
    .nav-scrim {
      display: none;
      position: fixed; inset: 0; z-index: 40;
      border: 0; padding: 0; margin: 0;
      background: rgba(28, 25, 23, 0.4); cursor: pointer;
    }
    .sidebar {
      border-right: 1px solid var(--color-border);
      background: var(--color-surface);
      padding: 1.25rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      position: sticky;
      top: 0;
      height: 100dvh;
      z-index: 50;
    }
    .sidebar__brand { display: flex; gap: 0.75rem; align-items: center; }
    .sidebar__mark {
      width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; flex-shrink: 0;
      display: grid; place-items: center; font-weight: 700; color: white;
      background: var(--portal-accent, var(--color-accent));
    }
    .sidebar__eyebrow {
      margin: 0; font-size: 0.6875rem; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--color-muted);
    }
    .sidebar__title { margin: 0; font-family: var(--font-display); font-size: 1.125rem; }
    .sidebar__close {
      display: none; margin-left: auto;
      width: 2.5rem; height: 2.5rem; border-radius: 0.625rem;
      border: 1px solid var(--color-border); background: var(--color-surface);
      cursor: pointer; font-size: 1rem; color: var(--color-muted);
    }
    .sidebar__nav { display: grid; gap: 0.25rem; flex: 1; overflow: auto; }
    .sidebar__nav a {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 0.75rem; border-radius: 0.625rem;
      text-decoration: none; color: var(--color-muted); font-size: 0.875rem;
      min-height: 2.75rem;
    }
    .sidebar__nav a:hover { background: var(--color-surface-2); color: var(--color-text); }
    .sidebar__nav a.active {
      background: color-mix(in srgb, var(--portal-accent) 12%, white);
      color: var(--portal-accent);
      font-weight: 600;
    }
    .sidebar__footer { display: grid; gap: 0.5rem; margin-top: auto; }
    .portal__main { min-width: 0; display: flex; flex-direction: column; flex: 1; }
    .topbar {
      border-bottom: 1px solid var(--color-border);
      background: color-mix(in srgb, var(--color-surface) 92%, transparent);
      padding: 0.65rem var(--page-pad-x, 1.25rem);
      min-height: 3.25rem;
      display: flex; align-items: center; gap: 0.75rem;
      position: sticky; top: 0; z-index: 30;
    }
    .topbar__slot { flex: 1; min-width: 0; }
    .menu-btn {
      display: none;
      width: 2.75rem; height: 2.75rem; flex-shrink: 0;
      border-radius: 0.75rem; border: 1px solid var(--color-border);
      background: var(--color-surface); cursor: pointer;
      place-items: center;
    }
    .menu-btn__bars,
    .menu-btn__bars::before,
    .menu-btn__bars::after {
      display: block; width: 1.125rem; height: 2px;
      background: var(--color-text); border-radius: 2px;
      position: relative;
    }
    .menu-btn__bars::before,
    .menu-btn__bars::after {
      content: ''; position: absolute; left: 0;
    }
    .menu-btn__bars::before { top: -6px; }
    .menu-btn__bars::after { top: 6px; }
    .content {
      padding: var(--page-pad-y, 1.25rem) var(--page-pad-x, 1.25rem);
      max-width: 1200px; width: 100%; margin: 0 auto; flex: 1;
      min-width: 0;
    }

    @media (max-width: 1024px) {
      .portal { grid-template-columns: 1fr; }
      .menu-btn { display: grid; }
      .nav-scrim { display: block; }
      .sidebar {
        position: fixed; inset: 0 auto 0 0; width: min(18rem, 86vw);
        transform: translateX(-105%);
        transition: transform 0.2s ease;
        box-shadow: none; border-right: 1px solid var(--color-border);
      }
      .portal.nav-open .sidebar { transform: translateX(0); box-shadow: var(--shadow-card); }
      .sidebar__close { display: grid; place-items: center; }
      .content { padding: 1rem var(--page-pad-x, 1rem) 1.5rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .sidebar { transition: none; }
    }
  `,
})
export class SidebarShellComponent {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = input.required<string>();
  readonly accent = input('#1e3a5f');
  readonly navItems = input.required<AdminNavItem[]>();

  protected readonly navOpen = signal(false);
  private compact = false;

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navOpen.set(false));

    if (isPlatformBrowser(this.platformId)) {
      const mq = window.matchMedia('(max-width: 1024px)');
      const sync = (): void => {
        this.compact = mq.matches;
        if (!this.compact) this.navOpen.set(false);
      };
      sync();
      mq.addEventListener('change', sync);
      this.destroyRef.onDestroy(() => mq.removeEventListener('change', sync));
    }
  }

  toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  onNavClick(): void {
    if (this.compact) this.navOpen.set(false);
  }
}
