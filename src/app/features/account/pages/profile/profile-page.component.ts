import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthApi } from '../../../../core/api/auth.api';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Mi cuenta</h1>

    @if (auth.profile(); as profile) {
      <section class="card">
        <h2>Datos personales</h2>
        <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
          <div class="form-row">
            <label>Nombre <input formControlName="first_name" /></label>
            <label>Apellido <input formControlName="last_name" /></label>
          </div>
          <label>Teléfono <input formControlName="phone" /></label>
          <label>Email <input [value]="profile.email" disabled /></label>
          <button type="submit" class="btn btn--primary" [disabled]="profileForm.invalid || savingProfile()">
            {{ savingProfile() ? 'Guardando…' : 'Guardar perfil' }}
          </button>
        </form>
      </section>

      <section class="card">
        <h2>Cambiar contraseña</h2>
        <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
          <label>Contraseña actual <input type="password" formControlName="old_password" autocomplete="current-password" /></label>
          <label>Nueva contraseña <input type="password" formControlName="new_password" autocomplete="new-password" /></label>
          <button type="submit" class="btn btn--secondary" [disabled]="passwordForm.invalid || savingPassword()">
            {{ savingPassword() ? 'Actualizando…' : 'Actualizar contraseña' }}
          </button>
        </form>
      </section>

      <nav class="links">
        <a routerLink="/ecommerce/cuenta/pedidos">Mis compras</a>
        <a routerLink="/ecommerce/cuenta/reservas">Mis reservas</a>
        <a routerLink="/ecommerce/reserva">Nueva reserva multi-prenda</a>
      </nav>
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0 0 1rem; }
    .card {
      padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.875rem;
      background: var(--color-surface); margin-bottom: 1rem;
    }
    h2 { font-size: 1rem; margin: 0 0 0.75rem; }
    label { display: grid; gap: 0.35rem; margin-bottom: 0.75rem; font-size: 0.875rem; font-weight: 500; }
    input {
      padding: 0.625rem 0.75rem; border: 1px solid var(--color-border); border-radius: 0.625rem;
      font: inherit; background: var(--color-bg);
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .links { display: grid; gap: 0.5rem; margin-top: 1rem; }
    .links a { color: var(--color-accent); }
    @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }
  `,
})
export class ProfilePageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApi);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);

  protected readonly profileForm = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    phone: [''],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    old_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    const p = this.auth.profile();
    if (p) {
      this.profileForm.patchValue({
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone ?? '',
      });
    }
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) return;
    this.savingProfile.set(true);
    try {
      await firstValueFrom(
        this.authApi.updateProfile(this.auth.user()!.id, this.profileForm.getRawValue()),
      );
      await this.auth.refreshProfile();
      this.notifications.success('Perfil actualizado');
    } catch {
      this.notifications.error('No se pudo guardar el perfil');
    } finally {
      this.savingProfile.set(false);
    }
  }

  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) return;
    const { old_password, new_password } = this.passwordForm.getRawValue();
    this.savingPassword.set(true);
    try {
      await firstValueFrom(this.authApi.changePassword(old_password, new_password));
      this.notifications.success('Contraseña actualizada');
      this.passwordForm.reset();
    } catch {
      this.notifications.error('Contraseña actual incorrecta o error al guardar');
    } finally {
      this.savingPassword.set(false);
    }
  }
}
