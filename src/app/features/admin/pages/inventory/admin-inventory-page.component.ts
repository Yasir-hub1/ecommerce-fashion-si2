import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { OrgApi } from '../../../../core/api/catalog-admin.api';
import { InventoryApi } from '../../../../core/api/inventory.api';
import { CatalogAdminApi } from '../../../../core/api/catalog-admin.api';
import type { BranchStock, InventoryMovement, VariantDetail } from '../../../../core/models/admin.models';
import type { Branch } from '../../../../core/models/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

type Tab = 'stock' | 'movements' | 'alerts';

@Component({
  selector: 'app-admin-inventory-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Inventario</h1>
        <p class="subtitle">Stock por sucursal · ajustes · transferencias · movimientos (RF21–22).</p>
      </div>
      @if (canManage() && tab() === 'stock') {
        <div class="actions">
          <button type="button" class="btn btn--ghost" (click)="openAdjust()">Ajustar</button>
          <button type="button" class="btn btn--primary" (click)="openTransfer()">Transferir</button>
        </div>
      }
    </header>

    <div class="toolbar">
      <label>Sucursal
        <select [value]="branchId()" (change)="onBranchChange($event)">
          @for (b of branches(); track b.id) {
            <option [value]="b.id">{{ b.name }}</option>
          }
        </select>
      </label>
      <div class="tabs">
        <button type="button" class="tab" [class.active]="tab() === 'stock'" (click)="tab.set('stock')">Stock</button>
        <button type="button" class="tab" [class.active]="tab() === 'alerts'" (click)="tab.set('alerts')">Alertas</button>
        <button type="button" class="tab" [class.active]="tab() === 'movements'" (click)="tab.set('movements')">Movimientos</button>
      </div>
    </div>

    @if (loading()) { <p>Cargando…</p> }
    @else if (tab() === 'movements') {
      @if (!movements().length) {
        <app-empty-state icon="📋" title="Sin movimientos" description="El historial aparecerá tras ajustes, ventas o recepciones." />
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>SKU</th><th>Cant.</th><th>Nota</th></tr></thead>
            <tbody>
              @for (m of movements(); track m.id) {
                <tr>
                  <td>{{ m.created_at | date:'short' }}</td>
                  <td>{{ m.movement_type_display }}</td>
                  <td>{{ m.variant_sku }}</td>
                  <td>{{ m.quantity }}</td>
                  <td>{{ m.note || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      @if (!stock().length) {
        <app-empty-state icon="📦" title="Sin stock" description="Registra variantes y recepciones de compra." />
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th><th>SKU</th><th>Talla</th><th>Disponible</th><th>Reservado</th><th>Umbral</th>
                @if (canManage()) { <th></th> }
              </tr>
            </thead>
            <tbody>
              @for (s of stock(); track s.id) {
                <tr [class.low]="s.available <= s.min_threshold">
                  <td>{{ s.product_name }}</td>
                  <td>{{ s.variant_sku }}</td>
                  <td>{{ s.size_code }} · {{ s.color_name }}</td>
                  <td>{{ s.available }}</td>
                  <td>{{ s.reserved }}</td>
                  <td>{{ s.min_threshold }}</td>
                  @if (canManage()) {
                    <td>
                      <button type="button" class="btn btn--ghost" (click)="editThreshold(s)">Umbral</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    @if (adjustModal()) {
      <div class="modal-backdrop" (click)="adjustModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Ajuste de stock</h2>
          <form [formGroup]="adjustForm" (ngSubmit)="submitAdjust()">
            <label>Variante (SKU)
              <select formControlName="variant_id">
                @for (v of variantOptions(); track v.id) { <option [value]="v.id">{{ v.sku }}</option> }
              </select>
            </label>
            <div class="form-row">
              <label>Cantidad <input type="number" formControlName="quantity" min="1" /></label>
              <label>Dirección
                <select formControlName="direction">
                  <option value="in">Entrada (+)</option>
                  <option value="out">Salida (−)</option>
                </select>
              </label>
            </div>
            <label>Nota <input formControlName="note" /></label>
            <div class="modal-actions">
              <button type="button" class="btn btn--ghost" (click)="adjustModal.set(false)">Cancelar</button>
              <button type="submit" class="btn btn--primary">Aplicar</button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (transferModal()) {
      <div class="modal-backdrop" (click)="transferModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Transferencia entre sucursales</h2>
          <form [formGroup]="transferForm" (ngSubmit)="submitTransfer()">
            <label>Variante
              <select formControlName="variant_id">
                @for (v of variantOptions(); track v.id) { <option [value]="v.id">{{ v.sku }}</option> }
              </select>
            </label>
            <div class="form-row">
              <label>Origen
                <select formControlName="from_branch_id">
                  @for (b of branches(); track b.id) { <option [value]="b.id">{{ b.name }}</option> }
                </select>
              </label>
              <label>Destino
                <select formControlName="to_branch_id">
                  @for (b of branches(); track b.id) { <option [value]="b.id">{{ b.name }}</option> }
                </select>
              </label>
            </div>
            <label>Cantidad <input type="number" formControlName="quantity" min="1" /></label>
            <label>Nota <input formControlName="note" /></label>
            <div class="modal-actions">
              <button type="button" class="btn btn--ghost" (click)="transferModal.set(false)">Cancelar</button>
              <button type="submit" class="btn btn--primary">Transferir</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [
    ADMIN_CRUD_STYLES,
    `
    .toolbar { display: flex; gap: 1rem; flex-wrap: wrap; align-items: end; margin-bottom: 1rem; }
    .toolbar label { display: grid; gap: 0.375rem; font-size: 0.875rem; }
    .low { background: color-mix(in srgb, #b45309 8%, transparent); }
    `,
  ],
})
export class AdminInventoryPageComponent implements OnInit {
  private readonly inventoryApi = inject(InventoryApi);
  private readonly orgApi = inject(OrgApi);
  private readonly catalogApi = inject(CatalogAdminApi);
  private readonly auth = inject(AuthService);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly tab = signal<Tab>('stock');
  protected readonly branchId = signal(0);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly stock = signal<BranchStock[]>([]);
  protected readonly movements = signal<InventoryMovement[]>([]);
  protected readonly variantOptions = signal<VariantDetail[]>([]);
  protected readonly adjustModal = signal(false);
  protected readonly transferModal = signal(false);
  protected readonly canManage = computed(() => this.permissions.has('inventory.stock.manage'));

  protected readonly adjustForm = this.fb.nonNullable.group({
    variant_id: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    direction: ['in' as 'in' | 'out', Validators.required],
    note: [''],
  });

  protected readonly transferForm = this.fb.nonNullable.group({
    variant_id: ['', Validators.required],
    from_branch_id: ['', Validators.required],
    to_branch_id: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    note: [''],
  });

  constructor() {
    effect(() => {
      const tab = this.tab();
      const branch = this.branchId();
      if (branch) void this.loadTab(tab, branch);
    });
  }

  ngOnInit(): void { void this.init(); }

  onBranchChange(event: Event): void {
    this.branchId.set(Number((event.target as HTMLSelectElement).value));
  }

  openAdjust(): void {
    this.adjustForm.patchValue({ variant_id: String(this.variantOptions()[0]?.id ?? '') });
    this.adjustModal.set(true);
  }

  openTransfer(): void {
    const branch = this.branchId();
    this.transferForm.patchValue({
      variant_id: String(this.variantOptions()[0]?.id ?? ''),
      from_branch_id: String(branch),
      to_branch_id: String(this.branches().find((b) => b.id !== branch)?.id ?? branch),
    });
    this.transferModal.set(true);
  }

  async editThreshold(s: BranchStock): Promise<void> {
    const value = prompt('Umbral mínimo', String(s.min_threshold));
    if (value === null || !this.canManage()) return;
    try {
      await firstValueFrom(this.inventoryApi.updateThreshold(s.id, Number(value)));
      this.notifications.success('Umbral actualizado');
      await this.loadStock(this.branchId());
    } catch { this.notifications.error('No se pudo actualizar'); }
  }

  async submitAdjust(): Promise<void> {
    if (this.adjustForm.invalid) return;
    const raw = this.adjustForm.getRawValue();
    try {
      await firstValueFrom(this.inventoryApi.adjust({
        branch_id: this.branchId(),
        variant_id: Number(raw.variant_id),
        quantity: raw.quantity,
        direction: raw.direction,
        note: raw.note,
      }));
      this.notifications.success('Stock ajustado');
      this.adjustModal.set(false);
      await this.loadStock(this.branchId());
    } catch { this.notifications.error('No se pudo ajustar'); }
  }

  async submitTransfer(): Promise<void> {
    if (this.transferForm.invalid) return;
    const raw = this.transferForm.getRawValue();
    try {
      await firstValueFrom(this.inventoryApi.transfer({
        from_branch_id: Number(raw.from_branch_id),
        to_branch_id: Number(raw.to_branch_id),
        variant_id: Number(raw.variant_id),
        quantity: raw.quantity,
        note: raw.note,
      }));
      this.notifications.success('Transferencia registrada');
      this.transferModal.set(false);
      await this.loadStock(this.branchId());
    } catch { this.notifications.error('No se pudo transferir'); }
  }

  private async init(): Promise<void> {
    try {
      const [branches, variants] = await Promise.all([
        firstValueFrom(this.orgApi.listBranches()),
        firstValueFrom(this.catalogApi.listVariants({ page_size: 100 })),
      ]);
      this.branches.set(branches.results);
      this.variantOptions.set(variants.results);
      const defaultBranch = this.auth.user()?.branch_id ?? branches.results[0]?.id ?? 0;
      this.branchId.set(defaultBranch);
    } finally { this.loading.set(false); }
  }

  private async loadTab(tab: Tab, branch: number): Promise<void> {
    this.loading.set(true);
    try {
      if (tab === 'movements') await this.loadMovements(branch);
      else if (tab === 'alerts') await this.loadLowStock(branch);
      else await this.loadStock(branch);
    } finally { this.loading.set(false); }
  }

  private async loadStock(branch: number): Promise<void> {
    const res = await firstValueFrom(this.inventoryApi.listStock({ branch }));
    this.stock.set(res.results);
  }

  private async loadLowStock(branch: number): Promise<void> {
    const res = await firstValueFrom(this.inventoryApi.lowStock({ branch }));
    this.stock.set(res.results);
  }

  private async loadMovements(branch: number): Promise<void> {
    const res = await firstValueFrom(this.inventoryApi.listMovements({ branch }));
    this.movements.set(res.results);
  }
}
