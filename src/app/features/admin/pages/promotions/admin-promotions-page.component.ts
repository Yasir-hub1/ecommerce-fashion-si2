import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { PromotionsApi, type Promotion } from '../../../../core/api/promotions.api';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Porcentaje' },
  { value: 'FIXED', label: 'Monto fijo' },
] as const;

@Component({
  selector: 'app-admin-promotions-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Promociones</h1>
        <p class="subtitle">Códigos de descuento y campañas comerciales.</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openCreate()">Nueva promoción</button>
      }
    </header>

    @if (!canView()) {
      <app-empty-state icon="🔒" title="Sin acceso" description="Necesitas permiso promotions.view para consultar promociones." />
    } @else if (loading()) { <p>Cargando…</p> }
    @else if (!items().length) {
      <app-empty-state icon="🎟️" title="Sin promociones" description="Crea códigos de descuento para el checkout." />
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Nombre</th><th>Descuento</th><th>Vigencia</th><th>Usos</th><th>Estado</th>
              @if (canManage()) { <th></th> }
            </tr>
          </thead>
          <tbody>
            @for (p of items(); track p.id) {
              <tr>
                <td><span class="badge">{{ p.code }}</span></td>
                <td>{{ p.name }}</td>
                <td>{{ discountLabel(p) }}</td>
                <td>{{ formatRange(p.starts_at, p.ends_at) }}</td>
                <td>{{ p.uses_count ?? p.used_count ?? 0 }}{{ p.max_uses ? ' / ' + p.max_uses : '' }}</td>
                <td>{{ p.is_active ? 'Activa' : 'Inactiva' }}</td>
                @if (canManage()) {
                  <td class="actions">
                    <button type="button" class="btn btn--ghost" (click)="openEdit(p)">Editar</button>
                    <button type="button" class="btn btn--ghost danger" (click)="remove(p)">Eliminar</button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (editorOpen()) {
      <div class="modal-backdrop" (click)="closeEditor()">
        <div class="modal wide" role="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editingId() ? 'Editar promoción' : 'Nueva promoción' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-row">
              <label>Código <input formControlName="code" placeholder="VERANO26" /></label>
              <label>Tipo
                <select formControlName="discount_type">
                  @for (t of discountTypes; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </label>
            </div>
            <label>Nombre <input formControlName="name" /></label>
            <label>Descripción <textarea formControlName="description" rows="2"></textarea></label>
            <div class="form-row">
              <label>Valor descuento <input formControlName="discount_value" type="number" step="0.01" /></label>
              <label>Mínimo pedido <input formControlName="min_order_amount" type="number" step="0.01" /></label>
            </div>
            <div class="form-row">
              <label>Máx. usos <input formControlName="max_uses" type="number" placeholder="Ilimitado" /></label>
              <label class="inline"><input type="checkbox" formControlName="is_active" /> Activa</label>
            </div>
            <div class="form-row">
              <label>Inicio <input type="datetime-local" formControlName="starts_at" /></label>
              <label>Fin <input type="datetime-local" formControlName="ends_at" /></label>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: ADMIN_CRUD_STYLES,
})
export class AdminPromotionsPageComponent implements OnInit {
  private readonly promotionsApi = inject(PromotionsApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly discountTypes = DISCOUNT_TYPES;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly items = signal<Promotion[]>([]);
  protected readonly canView = computed(() => this.permissions.hasAny('promotions.view', 'promotions.manage'));
  protected readonly canManage = computed(() => this.permissions.has('promotions.manage'));

  protected readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    discount_type: ['PERCENTAGE', Validators.required],
    discount_value: ['', Validators.required],
    min_order_amount: ['0'],
    max_uses: [''],
    starts_at: ['', Validators.required],
    ends_at: ['', Validators.required],
    is_active: [true],
  });

  ngOnInit(): void { void this.load(); }

  discountLabel(p: Promotion): string {
    const type = p.discount_type === 'PERCENT' || p.discount_type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
    const value = p.discount_value ?? p.value ?? '0';
    return type === 'PERCENTAGE' ? `${value}%` : `Bs ${value}`;
  }

  formatRange(from: string, to: string): string {
    return `${format(new Date(from), 'd MMM yyyy', { locale: es })} – ${format(new Date(to), 'd MMM yyyy', { locale: es })}`;
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      code: '', name: '', description: '', discount_type: 'PERCENTAGE',
      discount_value: '', min_order_amount: '0', max_uses: '',
      starts_at: '', ends_at: '', is_active: true,
    });
    this.editorOpen.set(true);
  }

  openEdit(p: Promotion): void {
    this.editingId.set(p.id);
    const discountType =
      p.discount_type === 'PERCENT' || p.discount_type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
    this.form.patchValue({
      code: p.code,
      name: p.name,
      description: p.description ?? '',
      discount_type: discountType,
      discount_value: p.discount_value ?? p.value ?? '',
      min_order_amount: p.min_order_amount,
      max_uses: p.max_uses != null ? String(p.max_uses) : '',
      starts_at: toDatetimeLocal(p.starts_at),
      ends_at: toDatetimeLocal(p.ends_at),
      is_active: p.is_active,
    });
    this.editorOpen.set(true);
  }

  closeEditor(): void { this.editorOpen.set(false); }

  async save(): Promise<void> {
    if (this.form.invalid || !this.canManage()) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Partial<Promotion> = {
      code: raw.code,
      name: raw.name,
      description: raw.description,
      discount_type: raw.discount_type as Promotion['discount_type'],
      discount_value: raw.discount_value,
      min_order_amount: raw.min_order_amount || '0',
      max_uses: raw.max_uses ? Number(raw.max_uses) : null,
      starts_at: fromDatetimeLocal(raw.starts_at),
      ends_at: fromDatetimeLocal(raw.ends_at),
      is_active: raw.is_active,
    };
    const id = this.editingId();
    try {
      if (id) await firstValueFrom(this.promotionsApi.update(id, body));
      else await firstValueFrom(this.promotionsApi.create(body));
      this.notifications.success('Promoción guardada');
      this.closeEditor();
      await this.load();
    } catch { this.notifications.error('No se pudo guardar'); }
    finally { this.saving.set(false); }
  }

  async remove(p: Promotion): Promise<void> {
    if (!confirm(`¿Eliminar promoción ${p.code}?`)) return;
    try {
      await firstValueFrom(this.promotionsApi.delete(p.id));
      this.notifications.info('Promoción eliminada');
      await this.load();
    } catch { this.notifications.error('No se pudo eliminar'); }
  }

  private async load(): Promise<void> {
    if (!this.canView()) {
      this.loading.set(false);
      return;
    }
    try {
      const res = await firstValueFrom(this.promotionsApi.list());
      this.items.set(res.results);
    } finally { this.loading.set(false); }
  }
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}
