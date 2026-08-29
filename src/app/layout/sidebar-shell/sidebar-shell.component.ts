import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import type { AdminNavItem } from '../../core/config/admin-nav.config';

@Component({
  selector: 'app-sidebar-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="portal" [style.--portal-accent]="accent()">
      <aside class="sidebar" aria-label="Navegación del backoffice">
        <div class="sidebar__brand">
          <span class="sidebar__mark">FS</span>
          <div>
            <p class="sidebar__eyebrow">FashionStore</p>
            <h1 class="sidebar__title">{{ title() }}</h1>
          </div>
        </div>

        <nav class="sidebar__nav">
          @for (item of navItems(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
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
          <ng-content select="[topbar]" />
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
    }
    .sidebar__brand { display: flex; gap: 0.75rem; align-items: center; }
    .sidebar__mark {
      width: 2.5rem; height: 2.5rem; border-radius: 0.75rem;
      display: grid; place-items: center; font-weight: 700; color: white;
      background: var(--portal-accent, var(--color-accent));
    }
    .sidebar__eyebrow {
      margin: 0; font-size: 0.6875rem; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--color-muted);
    }
    .sidebar__title { margin: 0; font-family: var(--font-display); font-size: 1.125rem; }
    .sidebar__nav { display: grid; gap: 0.25rem; flex: 1; overflow: auto; }
    .sidebar__nav a {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 0.75rem; border-radius: 0.625rem;
      text-decoration: none; color: var(--color-muted); font-size: 0.875rem;
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
      padding: 0.75rem 1.25rem;
      min-height: 3.25rem;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    }
    .content { padding: 1.25rem; max-width: 1200px; width: 100%; margin: 0 auto; flex: 1; }
    @media (max-width: 900px) {
      .portal { grid-template-columns: 1fr; }
      .sidebar { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--color-border); }
      .sidebar__nav { grid-auto-flow: column; grid-auto-columns: max-content; overflow-x: auto; }
    }
  `,
})
export class SidebarShellComponent {
  readonly title = input.required<string>();
  readonly accent = input('#1e3a5f');
  readonly navItems = input.required<AdminNavItem[]>();
}
