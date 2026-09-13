import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-shell anim-rise">
      <div class="auth-brand">
        <p class="auth-brand__name">VETA</p>
        <p class="auth-brand__line">Una cuenta para todas las sucursales</p>
      </div>
      <div class="auth-card">
        <h1>Crear cuenta</h1>
        <p class="subtitle">Reserva en probador y compra con stock real de tu tienda.</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid-2">
            <label>
              Nombre
              <input formControlName="first_name" autocomplete="given-name" />
            </label>
            <label>
              Apellido
              <input formControlName="last_name" autocomplete="family-name" />
            </label>
          </div>
          <label>
            Email
            <input type="email" formControlName="email" autocomplete="email" />
          </label>
          <label>
            Teléfono (opcional)
            <input formControlName="phone" autocomplete="tel" />
          </label>
          <label>
            Contraseña
            <input type="password" formControlName="password" autocomplete="new-password" />
          </label>
          <label>
            Confirmar contraseña
            <input type="password" formControlName="password_confirm" autocomplete="new-password" />
          </label>

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }

          <button type="submit" class="btn btn--primary btn--block" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Creando cuenta…' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="footer-link">
          ¿Ya tienes cuenta? <a routerLink="/auth/login">Entrar</a>
        </p>
      </div>
    </div>
  `,
  styles: `
    .auth-shell { max-width: 32rem; margin: 2.5rem auto; }
    .auth-brand { margin-bottom: 1rem; }
    .auth-brand__name {
      margin: 0; font-family: var(--font-display); font-weight: 800;
      font-size: 2rem; letter-spacing: -0.05em;
    }
    .auth-brand__line {
      margin: 0.2rem 0 0; font-size: 0.75rem; text-transform: uppercase;
      letter-spacing: 0.12em; color: var(--color-muted);
    }
    .auth-card {
      padding: 1.75rem; background: var(--color-surface);
      border: 1px solid var(--color-border); border-top: 3px solid var(--color-accent);
      box-shadow: var(--shadow-card);
    }
    h1 { font-family: var(--font-display); margin: 0 0 0.5rem; font-size: 1.5rem; letter-spacing: -0.03em; }
    .subtitle { color: var(--color-muted); margin: 0 0 1.5rem; }
    form { display: grid; gap: 1rem; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
    input {
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      padding: 0.75rem 0.875rem; font: inherit; background: var(--color-bg);
    }
    .error { color: var(--color-danger); font-size: 0.875rem; margin: 0; }
    .footer-link { margin-top: 1.25rem; text-align: center; color: var(--color-muted); font-size: 0.875rem; }
    .footer-link a { color: var(--color-accent); font-weight: 600; }
    @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirm: ['', Validators.required],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    const data = this.form.getRawValue();
    if (data.password !== data.password_confirm) {
      this.error.set('Las contraseñas no coinciden');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      await this.auth.register(data);
      this.notifications.success('Cuenta creada correctamente');
      await this.router.navigateByUrl('/ecommerce');
    } catch {
      this.error.set('No se pudo crear la cuenta. El email puede estar en uso.');
    } finally {
      this.loading.set(false);
    }
  }
}
