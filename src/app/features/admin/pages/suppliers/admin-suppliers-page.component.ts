import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { OrgApi } from '../../../../core/api/catalog-admin.api';
import { SuppliersApi } from '../../../../core/api/suppliers.api';
import type { PurchaseReceipt, Supplier } from '../../../../core/models/admin.models';
import type { Branch } from '../../../../core/models/api.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

type Tab = 'suppliers' | 'receipts';

@Component({
  selector: 'app-admin-suppliers-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Proveedores</h1>
        <p class="subtitle">RF06 · proveedores y recepciones de compra (ingreso a stock).</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openCreate()">
          {{ tab() === 'suppliers' ? 'Nuevo proveedor' : 'Nueva recepción' }}
        </button>
      }
    </header>

    <div class="tabs">
      <button type="button" class="tab" [class.active]="tab() === 'suppliers'" (click)="tab.set('suppliers')">Proveedores</button>
      <button type="button" class="tab" [class.active]="tab() === 'receipts'" (click)="tab.set('receipts')">Recepciones</button>
    </div>

    @if (loading()) { <p>Cargando…</p> }
    @else if (tab() === 'suppliers') {
      @if (!suppliers().length) {
        <app-empty-state icon="🏭" title="Sin proveedores" description="Registra proveedores para vincular colecciones y recepciones." />
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Razón social</th><th>Nombre comercial</th><th>Email</th><th>Estado</th>@if (canManage()) { <th></th> }</tr></thead>
            <tbody>
              @for (s of suppliers(); track s.id) {
                <tr>
                  <td>{{ s.legal_name }}</td>
                  <td>{{ s.trade_name }}</td>
                  <td>{{ s.email }}</td>
                  <td>{{ s.is_active ? 'Activo' : 'Inactivo' }}</td>
                  @if (canManage()) {
                    <td class="actions">
                      <button type="button" class="btn btn--ghost" (click)="editSupplier(s)">Editar</button>
                      <button type="button" class="btn btn--ghost danger" (click)="removeSupplier(s)">Eliminar</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      @if (!receipts().length) {
        <app-empty-state icon="📥" title="Sin recepciones" description="Crea borradores y confírmalos para ingresar stock." />
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Código</th><th>Proveedor</th><th>Sucursal</th><th>Estado</th><th>Ítems</th>@if (canManage()) { <th></th> }</tr></thead>
            <tbody>
              @for (r of receipts(); track r.id) {
                <tr>
                  <td>{{ r.code }}</td>
                  <td>{{ r.supplier_name }}</td>
                  <td>{{ r.branch_code }}</td>
                  <td><span class="badge">{{ r.status }}</span></td>
                  <td>{{ r.item_count ?? (r.items.length || 0) }}</td>
                  @if (canManage()) {
                    <td class="actions">
                      @if (r.status === 'DRAFT') {
                        <button type="button" class="btn btn--primary" (click)="confirmReceipt(r)">Confirmar</button>
                        <button type="button" class="btn btn--ghost danger" (click)="cancelReceipt(r)">Cancelar</button>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    @if (editorOpen()) {
      <div class="modal-backdrop" (click)="closeEditor()">
        <div class="modal wide" role="dialog" (click)="$event.stopPropagation()">
          @if (tab() === 'suppliers') {
            <h2>{{ editingSupplierId() ? 'Editar proveedor' : 'Nuevo proveedor' }}</h2>
            <form [formGroup]="supplierForm" (ngSubmit)="saveSupplier()">
              <label>Razón social <input formControlName="legal_name" /></label>
              <label>Nombre comercial <input formControlName="trade_name" /></label>
              <div class="form-row">
                <label>NIT <input formControlName="tax_id" /></label>
                <label>Email <input type="email" formControlName="email" /></label>
              </div>
              <label>Teléfono <input formControlName="phone" /></label>
              <label>Dirección <input formControlName="address" /></label>
              <label class="inline"><input type="checkbox" formControlName="is_active" /> Activo</label>
              <div class="modal-actions">
                <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
                <button type="submit" class="btn btn--primary" [disabled]="supplierForm.invalid">Guardar</button>
              </div>
            </form>
          } @else {
            <h2>Nueva recepción (borrador)</h2>
            <form [formGroup]="receiptForm" (ngSubmit)="saveReceipt()">
              <div class="form-row">
                <label>Proveedor
                  <select formControlName="supplier">
                    @for (s of suppliers(); track s.id) { <option [value]="s.id">{{ s.trade_name }}</option> }
                  </select>
                </label>
                <label>Sucursal
                  <select formControlName="branch">
                    @for (b of branches(); track b.id) { <option [value]="b.id">{{ b.name }}</option> }
                  </select>
                </label>
              </div>
              <label>Nº factura <input formControlName="invoice_number" /></label>
              <label>Notas <input formControlName="notes" /></label>
              <fieldset>
                <legend>Ítems (variante + cantidad + costo)</legend>
                <p class="hint">Usa IDs de variantes existentes. Confirma la recepción para mover stock.</p>
                <div class="form-row">
                  <label>Variante ID <input type="number" formControlName="variant_id" /></label>
                  <label>Cantidad <input type="number" formControlName="quantity" min="1" /></label>
                  <label>Costo unit. <input type="number" step="0.01" formControlName="unit_cost" /></label>
                </div>
              </fieldset>
              <div class="modal-actions">
                <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
                <button type="submit" class="btn btn--primary" [disabled]="receiptForm.invalid">Crear borrador</button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `,
  styles: [ADMIN_CRUD_STYLES, `.hint { font-size: 0.8125rem; color: var(--color-muted); margin: 0 0 0.5rem; } fieldset { border: 1px solid var(--color-border); border-radius: 0.625rem; padding: 0.75rem; }`],
})
export class AdminSuppliersPageComponent implements OnInit {
  private readonly suppliersApi = inject(SuppliersApi);
  private readonly orgApi = inject(OrgApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly tab = signal<Tab>('suppliers');
  protected readonly loading = signal(true);
  protected readonly editorOpen = signal(false);
  protected readonly editingSupplierId = signal<number | null>(null);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly receipts = signal<PurchaseReceipt[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('suppliers.manage'));

  protected readonly supplierForm = this.fb.nonNullable.group({
    legal_name: ['', Validators.required],
    trade_name: ['', Validators.required],
    tax_id: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address: [''],
    is_active: [true],
  });

  protected readonly receiptForm = this.fb.nonNullable.group({
    supplier: ['', Validators.required],
    branch: ['', Validators.required],
    invoice_number: [''],
    notes: [''],
    variant_id: ['', Validators.required],
    quantity: [1, Validators.min(1)],
    unit_cost: ['', Validators.required],
  });

  ngOnInit(): void { void this.load(); }

  openCreate(): void {
    if (this.tab() === 'suppliers') {
      this.editingSupplierId.set(null);
      this.supplierForm.reset({ legal_name: '', trade_name: '', tax_id: '', email: '', phone: '', address: '', is_active: true });
    } else {
      this.receiptForm.reset({
        supplier: String(this.suppliers()[0]?.id ?? ''),
        branch: String(this.branches()[0]?.id ?? ''),
        invoice_number: '', notes: '', variant_id: '', quantity: 1, unit_cost: '',
      });
    }
    this.editorOpen.set(true);
  }

  editSupplier(s: Supplier): void {
    this.editingSupplierId.set(s.id);
    this.supplierForm.patchValue(s);
    this.tab.set('suppliers');
    this.editorOpen.set(true);
  }

  closeEditor(): void { this.editorOpen.set(false); }

  async saveSupplier(): Promise<void> {
    if (this.supplierForm.invalid || !this.canManage()) return;
    const body = this.supplierForm.getRawValue();
    const id = this.editingSupplierId();
    try {
      if (id) await firstValueFrom(this.suppliersApi.updateSupplier(id, body));
      else await firstValueFrom(this.suppliersApi.createSupplier(body));
      this.notifications.success('Proveedor guardado');
      this.closeEditor();
      await this.loadSuppliers();
    } catch { this.notifications.error('No se pudo guardar'); }
  }

  async saveReceipt(): Promise<void> {
    if (this.receiptForm.invalid || !this.canManage()) return;
    const raw = this.receiptForm.getRawValue();
    const body = {
      supplier: Number(raw.supplier),
      branch: Number(raw.branch),
      invoice_number: raw.invoice_number,
      notes: raw.notes,
      items: [{ variant: Number(raw.variant_id), quantity: raw.quantity, unit_cost: String(raw.unit_cost) }],
    };
    try {
      await firstValueFrom(this.suppliersApi.createReceipt(body));
      this.notifications.success('Recepción creada en borrador');
      this.closeEditor();
      await this.loadReceipts();
    } catch { this.notifications.error('No se pudo crear la recepción'); }
  }

  async confirmReceipt(r: PurchaseReceipt): Promise<void> {
    try {
      await firstValueFrom(this.suppliersApi.confirmReceipt(r.id));
      this.notifications.success('Recepción confirmada — stock actualizado');
      await this.loadReceipts();
    } catch { this.notifications.error('No se pudo confirmar'); }
  }

  async cancelReceipt(r: PurchaseReceipt): Promise<void> {
    try {
      await firstValueFrom(this.suppliersApi.cancelReceipt(r.id));
      this.notifications.info('Recepción cancelada');
      await this.loadReceipts();
    } catch { this.notifications.error('No se pudo cancelar'); }
  }

  async removeSupplier(s: Supplier): Promise<void> {
    if (!confirm(`¿Eliminar ${s.trade_name}?`)) return;
    try {
      await firstValueFrom(this.suppliersApi.deleteSupplier(s.id));
      this.notifications.info('Proveedor eliminado');
      await this.loadSuppliers();
    } catch { this.notifications.error('No se pudo eliminar'); }
  }

  private async load(): Promise<void> {
    try {
      const branches = await firstValueFrom(this.orgApi.listBranches());
      this.branches.set(branches.results);
      await Promise.all([this.loadSuppliers(), this.loadReceipts()]);
    } finally { this.loading.set(false); }
  }

  private async loadSuppliers(): Promise<void> {
    const res = await firstValueFrom(this.suppliersApi.listSuppliers());
    this.suppliers.set(res.results);
  }

  private async loadReceipts(): Promise<void> {
    const res = await firstValueFrom(this.suppliersApi.listReceipts());
    this.receipts.set(res.results);
  }
}
