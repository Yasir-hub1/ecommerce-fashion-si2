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
      <app-portal-topbar topbar>
        <span>{{ roleName() }}</span>
        · Backoffice FashionStore
        <a sidebar-footer routerLink="/ecommerce" class="store-link">Ir a e-commerce</a>
      </app-portal-topbar>
    </app-sidebar-shell>
  `,
  styles: `.store-link { font-size: 0.8125rem; color: var(--color-muted); text-decoration: none; }`,
})
export class AdminShellComponent {
  private readonly permissions = inject(PermissionService);

  protected readonly shell = ADMIN_SHELL;
  protected readonly navItems = computed(() => this.permissions.visibleAdminNav());
  protected readonly roleName = computed(() => this.permissions.roleName() || this.permissions.role());
}
