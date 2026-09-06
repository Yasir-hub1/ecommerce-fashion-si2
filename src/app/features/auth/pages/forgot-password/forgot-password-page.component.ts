import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthApi } from '../../../../core/api/auth.api';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-card">
      <h1>Recuperar contraseña</h1>
      <p class="subtitle">Te enviaremos instrucciones si el email está registrado.</p>

      @if (sent()) {
        <p class="success" role="status">
          Si el correo existe, recibirás un enlace para restablecer tu contraseña.
        </p>
        <a routerLink="/auth/login" class="btn btn--primary btn--block">Volver al login</a>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            Email
            <input type="email" formControlName="email" autocomplete="email" />
          </label>
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <button type="submit" class="btn btn--primary btn--block" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Enviando…' : 'Enviar enlace' }}
          </button>
        </form>
      }

      <p class="footer-link"><a routerLink="/auth/login">← Iniciar sesión</a></p>
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
    label { display: grid; gap: 0.35rem; margin-bottom: 1rem; font-size: 0.875rem; font-weight: 500; }
    input {
      padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.625rem;
      font: inherit; background: var(--color-bg);
    }
    .error { color: #b91c1c; font-size: 0.875rem; margin: 0 0 1rem; }
    .success { color: #15803d; margin: 0 0 1rem; line-height: 1.5; }
    .footer-link { text-align: center; margin-top: 1.25rem; font-size: 0.875rem; }
    .footer-link a { color: var(--color-accent); }
  `,
})
export class ForgotPasswordPageComponent {
  private readonly authApi = inject(AuthApi);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.authApi.requestPasswordReset(this.form.controls.email.value));
      this.sent.set(true);
    } catch {
      // Mostrar mensaje genérico aunque falle (seguridad)
      this.sent.set(true);
      this.notifications.info('Revisa tu bandeja de entrada');
    } finally {
      this.loading.set(false);
    }
  }
}
