import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import {
  ADMIN_NAV_GROUP_ORDER,
  type AdminNavItem,
} from '../../core/config/admin-nav.config';

interface NavGroup {
  name: string;
  items: AdminNavItem[];
}

@Component({
  selector: 'app-sidebar-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="portal" [class.portal--nav-open]="navOpen()" [style.--portal-accent]="accent()">
      <button
        type="button"
        class="nav-scrim"
        aria-label="Cerrar menú"
        (click)="navOpen.set(false)"
      ></button>

      <aside id="ops-sidebar" class="sidebar" aria-label="Navegación del backoffice">
        <div class="sidebar__brand">
          <span class="sidebar__mark" aria-hidden="true">
            <span class="sidebar__stitch"></span>
          </span>
          <div class="sidebar__brand-text">
            <p class="sidebar__eyebrow">VETA</p>
            <h1 class="sidebar__title">{{ title() }}</h1>
          </div>
          <button
            type="button"
            class="sidebar__close"
            aria-label="Cerrar menú"
            (click)="navOpen.set(false)"
          >
            ✕
          </button>
        </div>

        <nav class="sidebar__nav">
          @for (group of navGroups(); track group.name) {
            <div class="nav-group">
              <p class="nav-group__label">{{ group.name }}</p>
              <div class="nav-group__items">
                @for (item of group.items; track item.path) {
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                    (click)="navOpen.set(false)"
                  >
                    <span class="nav-dot" aria-hidden="true"></span>
                    <span class="nav-label">{{ item.label }}</span>
                  </a>
                }
              </div>
            </div>
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
            class="nav-toggle"
            [attr.aria-expanded]="navOpen()"
            aria-controls="ops-sidebar"
            (click)="navOpen.set(!navOpen())"
          >
            <span class="nav-toggle__bars" aria-hidden="true"></span>
            Menú
          </button>
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
      grid-template-columns: 17.5rem 1fr;
      background: var(--color-bg);
    }

    .nav-scrim {
      display: none;
      border: 0;
      padding: 0;
      margin: 0;
      background: rgba(7, 17, 28, 0.45);
    }

    .sidebar {
      background: var(--color-ink);
      color: color-mix(in srgb, white 78%, transparent);
      padding: 1.1rem 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      position: sticky;
      top: 0;
      height: 100dvh;
      border-right: 1px solid color-mix(in srgb, white 8%, transparent);
      z-index: 40;
    }

    .sidebar__brand {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      padding: 0.35rem 0.5rem 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, white 10%, transparent);
    }
    .sidebar__mark {
      width: 2.35rem;
      height: 2.35rem;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      background: #fff;
      clip-path: polygon(0 0, 100% 0, 100% 72%, 72% 100%, 0 100%);
    }
    .sidebar__stitch {
      width: 0.9rem;
      height: 0.9rem;
      border: 2px solid var(--color-accent);
      transform: rotate(12deg);
    }
    .sidebar__brand-text { min-width: 0; flex: 1; }
    .sidebar__eyebrow {
      margin: 0;
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: color-mix(in srgb, white 48%, transparent);
      font-weight: 700;
    }
    .sidebar__title {
      margin: 0.1rem 0 0;
      font-family: var(--font-display);
      font-size: 1.15rem;
      letter-spacing: -0.03em;
      color: #fff;
      font-weight: 700;
    }
    .sidebar__close {
      display: none;
      border: 1px solid color-mix(in srgb, white 18%, transparent);
      background: transparent;
      color: #fff;
      width: 2rem;
      height: 2rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .sidebar__nav {
      display: grid;
      gap: 1rem;
      flex: 1;
      overflow: auto;
      padding-inline: 0.25rem;
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, white 25%, transparent) transparent;
    }

    .nav-group__label {
      margin: 0 0 0.4rem 0.65rem;
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: color-mix(in srgb, white 38%, transparent);
      font-weight: 700;
    }
    .nav-group__items { display: grid; gap: 0.15rem; }

    .sidebar__nav a {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.55rem 0.7rem;
      text-decoration: none;
      color: color-mix(in srgb, white 68%, transparent);
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--radius-sm);
      transition:
        background var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out),
        transform var(--duration-fast) var(--ease-out);
    }
    .sidebar__nav a:hover {
      background: color-mix(in srgb, white 8%, transparent);
      color: #fff;
    }
    .sidebar__nav a.active {
      background: color-mix(in srgb, white 12%, transparent);
      color: #fff;
      font-weight: 650;
    }
    .sidebar__nav a.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.35rem;
      bottom: 0.35rem;
      width: 3px;
      background: var(--color-accent);
      border-radius: 0 2px 2px 0;
    }
    .nav-dot {
      width: 0.4rem;
      height: 0.4rem;
      border: 1.5px solid currentColor;
      transform: rotate(45deg);
      flex-shrink: 0;
      opacity: 0.55;
    }
    .sidebar__nav a.active .nav-dot {
      background: var(--color-accent);
      border-color: var(--color-accent);
      opacity: 1;
    }
    .nav-label { min-width: 0; }

    .sidebar__footer {
      display: grid;
      gap: 0.5rem;
      margin-top: auto;
      padding: 0.85rem 0.5rem 0.25rem;
      border-top: 1px solid color-mix(in srgb, white 10%, transparent);
    }
    .sidebar__footer ::ng-deep a {
      color: color-mix(in srgb, white 70%, transparent);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .sidebar__footer ::ng-deep a:hover { color: #fff; }

    .portal__main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      flex: 1;
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 88%, transparent), transparent 12rem),
        var(--color-bg);
    }

    .topbar {
      border-bottom: 1px solid var(--color-border);
      background: color-mix(in srgb, var(--color-surface) 92%, transparent);
      backdrop-filter: blur(12px);
      padding: 0.7rem 1.25rem;
      min-height: 3.4rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .nav-toggle {
      display: none;
      align-items: center;
      gap: 0.45rem;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text);
      padding: 0.4rem 0.7rem;
      border-radius: var(--radius-sm);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
    }
    .nav-toggle__bars {
      width: 0.9rem;
      height: 0.7rem;
      background:
        linear-gradient(var(--color-ink), var(--color-ink)) 0 0 / 100% 2px no-repeat,
        linear-gradient(var(--color-ink), var(--color-ink)) 0 50% / 100% 2px no-repeat,
        linear-gradient(var(--color-ink), var(--color-ink)) 0 100% / 70% 2px no-repeat;
    }

    .content {
      padding: 1.5rem 1.35rem 2.5rem;
      max-width: 1180px;
      width: 100%;
      margin: 0 auto;
      flex: 1;
    }

    @media (max-width: 960px) {
      .portal { grid-template-columns: 1fr; }
      .nav-toggle { display: inline-flex; }
      .nav-scrim {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 35;
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--duration-med) var(--ease-out);
      }
      .portal--nav-open .nav-scrim {
        opacity: 1;
        pointer-events: auto;
      }
      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        width: min(18.5rem, 88vw);
        transform: translateX(-105%);
        transition: transform var(--duration-med) var(--ease-out);
        box-shadow: var(--shadow-lift);
      }
      .portal--nav-open .sidebar { transform: translateX(0); }
      .sidebar__close { display: grid; place-items: center; }
    }
  `,
})
export class SidebarShellComponent {
  readonly title = input.required<string>();
  readonly accent = input('#07111c');
  readonly navItems = input.required<AdminNavItem[]>();

  protected readonly navOpen = signal(false);

  protected readonly navGroups = computed((): NavGroup[] => {
    const items = this.navItems();
    const buckets = new Map<string, AdminNavItem[]>();

    for (const item of items) {
      const key = item.group ?? 'Más';
      const list = buckets.get(key) ?? [];
      list.push(item);
      buckets.set(key, list);
    }

    const ordered: NavGroup[] = [];
    for (const name of ADMIN_NAV_GROUP_ORDER) {
      const groupItems = buckets.get(name);
      if (groupItems?.length) {
        ordered.push({ name, items: groupItems });
        buckets.delete(name);
      }
    }
    for (const [name, groupItems] of buckets) {
      ordered.push({ name, items: groupItems });
    }
    return ordered;
  });
}
