import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ADMIN_SHELL } from '../../core/config/admin-nav.config';
import { PermissionService } from '../../core/services/permission.service';
import { PortalTopbarComponent } from '../portal-topbar/portal-topbar.component';
import { SidebarShellComponent } from '../sidebar-shell/sidebar-shell.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [SidebarShellComponent, PortalTopbarComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-sidebar-shell
      [title]="shell.label"
      [accent]="shell.accent"
      [navItems]="navItems()"
    >
      <a sidebar-footer routerLink="/ecommerce" class="store-link">← Ir a la tienda</a>
      <app-portal-topbar topbar>
        <span class="crumb">
          <strong>{{ roleName() }}</strong>
          · consolas VETA
        </span>
      </app-portal-topbar>
    </app-sidebar-shell>
  `,
  styles: `
    .store-link {
      display: inline-flex;
      align-items: center;
      padding: 0.45rem 0.55rem;
      border-radius: var(--radius-sm);
      transition: background 0.15s ease, color 0.15s ease;
    }
    .store-link:hover { background: color-mix(in srgb, white 10%, transparent); }
    .crumb strong { color: var(--color-text); font-weight: 650; }
  `,
})
export class AdminShellComponent {
  private readonly permissions = inject(PermissionService);

  protected readonly shell = ADMIN_SHELL;
  protected readonly navItems = computed(() => this.permissions.visibleAdminNav());
  protected readonly roleName = computed(() => this.permissions.roleName() || this.permissions.role());
}
