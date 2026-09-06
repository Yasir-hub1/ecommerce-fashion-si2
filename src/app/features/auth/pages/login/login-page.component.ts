import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-card">
      <h1>Bienvenido de nuevo</h1>
      <p class="subtitle">Inicia sesión para reservar, comprar y gestionar tu cuenta.</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>
          Email
          <input type="email" formControlName="email" autocomplete="email" />
        </label>
        <label>
          Contraseña
          <input type="password" formControlName="password" autocomplete="current-password" />
        </label>
        <p class="forgot"><a routerLink="/auth/recuperar">¿Olvidaste tu contraseña?</a></p>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <button type="submit" class="btn btn--primary btn--block" [disabled]="loading() || form.invalid">
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>

      <p class="footer-link">
        ¿No tienes cuenta?
        <a routerLink="/auth/registro">Regístrate</a>
      </p>
    </div>
  `,
  styles: `
    .auth-card {
      max-width: 26rem; margin: 2rem auto; padding: 2rem;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: 1rem; box-shadow: var(--shadow-card);
    }
    h1 { font-family: var(--font-display); margin: 0 0 0.5rem; font-size: 1.75rem; }
    .subtitle { color: var(--color-muted); margin: 0 0 1.5rem; line-height: 1.5; }
    form { display: grid; gap: 1rem; }
    label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
    input {
      border: 1px solid var(--color-border); border-radius: 0.625rem;
      padding: 0.75rem 0.875rem; font: inherit; background: var(--color-bg);
    }
    .error { color: #b91c1c; font-size: 0.875rem; margin: 0; }
    .forgot { margin: 0; text-align: right; font-size: 0.8125rem; }
    .forgot a { color: var(--color-accent); }
    .footer-link { margin-top: 1.25rem; text-align: center; color: var(--color-muted); font-size: 0.875rem; }
    .footer-link a { color: var(--color-accent); }
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();

    try {
      const home = await this.auth.login(email, password);
      this.notifications.success('Sesión iniciada');
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl || home);
    } catch {
      this.error.set('Credenciales incorrectas. Verifica tu email y contraseña.');
    } finally {
      this.loading.set(false);
    }
  }
}
