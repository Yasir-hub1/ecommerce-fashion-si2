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
    <div class="auth-shell anim-rise">
      <div class="auth-brand">
        <p class="auth-brand__name">VETA</p>
        <p class="auth-brand__line">Tu cuenta en tienda y online</p>
      </div>
      <div class="auth-card">
        <h1>Entrar</h1>
        <p class="subtitle">Reserva probador, compra y sigue tus pedidos.</p>

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
          <a routerLink="/auth/registro">Crear cuenta</a>
        </p>
      </div>
    </div>
  `,
  styles: `
    .auth-shell { max-width: 26rem; margin: 2.5rem auto; }
    .auth-brand { margin-bottom: 1rem; }
    .auth-brand__name {
      margin: 0;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 2rem;
      letter-spacing: -0.05em;
    }
    .auth-brand__line {
      margin: 0.2rem 0 0;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--color-muted);
    }
    .auth-card {
      padding: 1.75rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-top: 3px solid var(--color-accent);
      box-shadow: var(--shadow-card);
    }
    h1 {
      font-family: var(--font-display);
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      letter-spacing: -0.03em;
    }
    .subtitle { color: var(--color-muted); margin: 0 0 1.5rem; line-height: 1.5; }
    form { display: grid; gap: 1rem; }
    label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
    input {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 0.75rem 0.875rem;
      font: inherit;
      background: var(--color-bg);
    }
    .error { color: var(--color-danger); font-size: 0.875rem; margin: 0; }
    .forgot { margin: 0; text-align: right; font-size: 0.8125rem; }
    .forgot a { color: var(--color-accent); }
    .footer-link { margin-top: 1.25rem; text-align: center; color: var(--color-muted); font-size: 0.875rem; }
    .footer-link a { color: var(--color-accent); font-weight: 600; }
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
