import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import { GENDERS, type Collection } from '../../../../core/models/admin.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { StaffContextService } from '../../../../core/services/staff-context.service';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-supplier-submit-product-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Proponer producto</h1>
        <p class="subtitle">Envía una propuesta de artículo para revisión del administrador.</p>
      </div>
    </header>

    <form class="submit-form" [formGroup]="form" (ngSubmit)="submit()">
      <label>Nombre <input formControlName="name" /></label>
      <label>Descripción <textarea formControlName="description" rows="3"></textarea></label>
      <div class="form-row">
        <label>Colección
          <select formControlName="collection">
            <option value="">— Seleccionar —</option>
            @for (c of collections(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>
        </label>
        <label>Género
          <select formControlName="gender">
            @for (g of genders; track g.value) {
              <option [value]="g.value">{{ g.label }}</option>
            }
          </select>
        </label>
      </div>
      <div class="form-row">
        <label>Precio base <input formControlName="base_price" type="number" step="0.01" /></label>
        <label>Material <input formControlName="material" /></label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn--primary" [disabled]="form.invalid || submitting()">
          {{ submitting() ? 'Enviando…' : 'Enviar propuesta' }}
        </button>
      </div>
    </form>
  `,
  styles: [
    ADMIN_CRUD_STYLES,
    `
      .submit-form { max-width: 640px; display: grid; gap: 0.875rem; }
      .modal-actions { justify-content: flex-start; }
    `,
  ],
})
export class SupplierSubmitProductPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(CatalogAdminApi);
  private readonly staff = inject(StaffContextService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly genders = GENDERS;
  protected readonly collections = signal<Collection[]>([]);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    collection: ['', Validators.required],
    gender: ['UNISEX', Validators.required],
    base_price: ['', Validators.required],
    material: [''],
  });

  ngOnInit(): void { void this.loadCollections(); }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name,
      description: raw.description,
      collection: Number(raw.collection),
      gender: raw.gender,
      base_price: raw.base_price,
      material: raw.material,
    };
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/supplier/product-submissions/`, body),
      );
      this.notifications.success('Propuesta enviada');
      this.form.reset({ name: '', description: '', collection: '', gender: 'UNISEX', base_price: '', material: '' });
    } catch {
      this.notifications.error(
        'No se pudo enviar la propuesta. El endpoint /supplier/product-submissions/ aún no está disponible en el backend.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadCollections(): Promise<void> {
    try {
      const params: Record<string, number> = {};
      if (this.staff.isSupplier()) {
        const supplierId = await this.staff.resolveSupplierId();
        if (supplierId) params['supplier'] = supplierId;
      }
      const res = await firstValueFrom(this.catalog.listCollections(params));
      this.collections.set(res.results);
    } catch {
      this.notifications.error('No se pudieron cargar las colecciones');
    }
  }
}
