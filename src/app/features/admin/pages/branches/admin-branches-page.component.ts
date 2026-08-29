import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { OrgApi } from '../../../../core/api/catalog-admin.api';
import type { Branch } from '../../../../core/models/api.models';
import type { City } from '../../../../core/models/admin.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

type Tab = 'branches' | 'cities';

@Component({
  selector: 'app-admin-branches-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Sucursales</h1>
        <p class="subtitle">Ciudades y puntos de venta FashionStore (RF03).</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openCreate()">
          {{ tab() === 'cities' ? 'Nueva ciudad' : 'Nueva sucursal' }}
        </button>
      }
    </header>

    <div class="tabs" role="tablist">
      <button type="button" class="tab" [class.active]="tab() === 'branches'" (click)="tab.set('branches')">Sucursales</button>
      <button type="button" class="tab" [class.active]="tab() === 'cities'" (click)="tab.set('cities')">Ciudades</button>
    </div>

    @if (loading()) { <p>Cargando…</p> }
    @else if (tab() === 'branches') {
      @if (!branches().length) {
        <app-empty-state icon="🏪" title="Sin sucursales" description="Registra ciudades y luego crea sucursales." />
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Código</th><th>Nombre</th><th>Ciudad</th><th>Horario</th><th>Prob.</th>@if (canManage()) { <th></th> }</tr></thead>
            <tbody>
              @for (b of branches(); track b.id) {
                <tr>
                  <td>{{ b.code }}</td>
                  <td>{{ b.name }}</td>
                  <td>{{ b.city_name }}</td>
                  <td>{{ b.opens_at }} – {{ b.closes_at }}</td>
                  <td>{{ b.fitting_rooms ?? '—' }}</td>
                  @if (canManage()) {
                    <td class="actions">
                      <button type="button" class="btn btn--ghost" (click)="editBranch(b)">Editar</button>
                      <button type="button" class="btn btn--ghost danger" (click)="removeBranch(b)">Eliminar</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      @if (!cities().length) {
        <app-empty-state icon="🌆" title="Sin ciudades" description="Crea ciudades antes de registrar sucursales." />
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ciudad</th><th>Departamento</th><th>Estado</th>@if (canManage()) { <th></th> }</tr></thead>
            <tbody>
              @for (c of cities(); track c.id) {
                <tr>
                  <td>{{ c.name }}</td>
                  <td>{{ c.department }}</td>
                  <td>{{ c.is_active ? 'Activa' : 'Inactiva' }}</td>
                  @if (canManage()) {
                    <td class="actions">
                      <button type="button" class="btn btn--ghost" (click)="editCity(c)">Editar</button>
                      <button type="button" class="btn btn--ghost danger" (click)="removeCity(c)">Eliminar</button>
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
        <div class="modal" role="dialog" (click)="$event.stopPropagation()">
          @if (tab() === 'cities') {
            <h2>{{ editingCityId() ? 'Editar ciudad' : 'Nueva ciudad' }}</h2>
            <form [formGroup]="cityForm" (ngSubmit)="saveCity()">
              <label>Nombre <input formControlName="name" /></label>
              <label>Departamento <input formControlName="department" /></label>
              <label class="inline"><input type="checkbox" formControlName="is_active" /> Activa</label>
              <div class="modal-actions">
                <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
                <button type="submit" class="btn btn--primary" [disabled]="cityForm.invalid || saving()">Guardar</button>
              </div>
            </form>
          } @else {
            <h2>{{ editingBranchId() ? 'Editar sucursal' : 'Nueva sucursal' }}</h2>
            <form [formGroup]="branchForm" (ngSubmit)="saveBranch()">
              <div class="form-row">
                <label>Código <input formControlName="code" placeholder="SCZ-01" /></label>
                <label>Ciudad
                  <select formControlName="city">
                    @for (c of cities(); track c.id) {
                      <option [value]="c.id">{{ c.name }}</option>
                    }
                  </select>
                </label>
              </div>
              <label>Nombre <input formControlName="name" /></label>
              <label>Dirección <input formControlName="address" /></label>
              <div class="form-row">
                <label>Teléfono <input formControlName="phone" /></label>
                <label>Probadores <input type="number" formControlName="fitting_rooms" min="0" /></label>
              </div>
              <div class="form-row">
                <label>Apertura <input type="time" formControlName="opens_at" /></label>
                <label>Cierre <input type="time" formControlName="closes_at" /></label>
              </div>
              <label class="inline"><input type="checkbox" formControlName="is_active" /> Activa</label>
              <div class="modal-actions">
                <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
                <button type="submit" class="btn btn--primary" [disabled]="branchForm.invalid || saving()">Guardar</button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `,
  styles: ADMIN_CRUD_STYLES,
})
export class AdminBranchesPageComponent implements OnInit {
  private readonly orgApi = inject(OrgApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly tab = signal<Tab>('branches');
  protected readonly editingCityId = signal<number | null>(null);
  protected readonly editingBranchId = signal<number | null>(null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly cities = signal<City[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('branches.manage'));

  protected readonly cityForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    department: ['', Validators.required],
    is_active: [true],
  });

  protected readonly branchForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    city: [0, Validators.required],
    address: ['', Validators.required],
    phone: [''],
    opens_at: ['09:00'],
    closes_at: ['21:00'],
    fitting_rooms: [4],
    is_active: [true],
  });

  ngOnInit(): void { void this.load(); }

  openCreate(): void {
    if (this.tab() === 'cities') {
      this.editingCityId.set(null);
      this.cityForm.reset({ name: '', department: '', is_active: true });
    } else {
      this.editingBranchId.set(null);
      const cityId = this.cities()[0]?.id ?? 0;
      this.branchForm.reset({
        code: '', name: '', city: cityId, address: '', phone: '',
        opens_at: '09:00', closes_at: '21:00', fitting_rooms: 4, is_active: true,
      });
    }
    this.editorOpen.set(true);
  }

  editCity(c: City): void {
    this.editingCityId.set(c.id);
    this.cityForm.patchValue({ name: c.name, department: c.department, is_active: c.is_active });
    this.tab.set('cities');
    this.editorOpen.set(true);
  }

  editBranch(b: Branch): void {
    this.editingBranchId.set(b.id);
    this.branchForm.patchValue({
      code: b.code, name: b.name, city: b.city, address: b.address,
      phone: b.phone ?? '', opens_at: (b.opens_at ?? '09:00:00').slice(0, 5),
      closes_at: (b.closes_at ?? '21:00:00').slice(0, 5),
      fitting_rooms: b.fitting_rooms ?? 4, is_active: b.is_active,
    });
    this.tab.set('branches');
    this.editorOpen.set(true);
  }

  closeEditor(): void { this.editorOpen.set(false); }

  async saveCity(): Promise<void> {
    if (this.cityForm.invalid || !this.canManage()) return;
    this.saving.set(true);
    const body = this.cityForm.getRawValue();
    const id = this.editingCityId();
    try {
      if (id) await firstValueFrom(this.orgApi.updateCity(id, body));
      else await firstValueFrom(this.orgApi.createCity(body));
      this.notifications.success('Ciudad guardada');
      this.closeEditor();
      await this.loadCities();
    } catch { this.notifications.error('No se pudo guardar la ciudad'); }
    finally { this.saving.set(false); }
  }

  async saveBranch(): Promise<void> {
    if (this.branchForm.invalid || !this.canManage()) return;
    this.saving.set(true);
    const raw = this.branchForm.getRawValue();
    const body = {
      ...raw,
      opens_at: `${raw.opens_at}:00`,
      closes_at: `${raw.closes_at}:00`,
    };
    const id = this.editingBranchId();
    try {
      if (id) await firstValueFrom(this.orgApi.updateBranch(id, body));
      else await firstValueFrom(this.orgApi.createBranch(body));
      this.notifications.success('Sucursal guardada');
      this.closeEditor();
      await this.loadBranches();
    } catch { this.notifications.error('No se pudo guardar la sucursal'); }
    finally { this.saving.set(false); }
  }

  async removeCity(c: City): Promise<void> {
    if (!confirm(`¿Eliminar ${c.name}?`)) return;
    try {
      await firstValueFrom(this.orgApi.deleteCity(c.id));
      this.notifications.info('Ciudad eliminada');
      await this.load();
    } catch { this.notifications.error('No se pudo eliminar'); }
  }

  async removeBranch(b: Branch): Promise<void> {
    if (!confirm(`¿Eliminar ${b.name}?`)) return;
    try {
      await firstValueFrom(this.orgApi.deleteBranch(b.id));
      this.notifications.info('Sucursal eliminada');
      await this.loadBranches();
    } catch { this.notifications.error('No se pudo eliminar'); }
  }

  private async load(): Promise<void> {
    try { await Promise.all([this.loadBranches(), this.loadCities()]); }
    finally { this.loading.set(false); }
  }

  private async loadBranches(): Promise<void> {
    const res = await firstValueFrom(this.orgApi.listBranches());
    this.branches.set(res.results);
  }

  private async loadCities(): Promise<void> {
    const res = await firstValueFrom(this.orgApi.listCities());
    this.cities.set(res.results);
  }
}
