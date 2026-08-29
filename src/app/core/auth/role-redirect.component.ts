import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-role-redirect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="loading">Redirigiendo…</p>`,
  styles: `.loading { padding: 2rem; text-align: center; color: var(--color-muted); }`,
})
export class RoleRedirectComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.router.navigateByUrl(this.auth.homePath());
  }
}
