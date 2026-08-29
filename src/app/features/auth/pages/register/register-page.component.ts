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
    <div class="auth-card">
      <h1>Crea tu cuenta</h1>
      <p class="subtitle">Regístrate para reservar prendas en probador y comprar online.</p>

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
          {{ loading() ? 'Creando cuenta…' : 'Registrarme' }}
        </button>
      </form>

      <p class="footer-link">
        ¿Ya tienes cuenta? <a routerLink="/auth/login">Inicia sesión</a>
      </p>
    </div>
  `,
  styles: `
    .auth-card {
      max-width: 32rem; margin: 2rem auto; padding: 2rem;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: 1rem; box-shadow: var(--shadow-card);
    }
    h1 { font-family: var(--font-display); margin: 0 0 0.5rem; font-size: 1.75rem; }
    .subtitle { color: var(--color-muted); margin: 0 0 1.5rem; }
    form { display: grid; gap: 1rem; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
    input {
      border: 1px solid var(--color-border); border-radius: 0.625rem;
      padding: 0.75rem 0.875rem; font: inherit; background: var(--color-bg);
    }
    .error { color: #b91c1c; font-size: 0.875rem; margin: 0; }
    .footer-link { margin-top: 1.25rem; text-align: center; color: var(--color-muted); font-size: 0.875rem; }
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
