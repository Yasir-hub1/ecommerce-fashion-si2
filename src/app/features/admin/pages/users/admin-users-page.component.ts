import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { OrgApi } from '../../../../core/api/catalog-admin.api';
import { RbacApi } from '../../../../core/api/rbac.api';
import { EMPLOYEE_POSITIONS } from '../../../../core/models/admin.models';
import type { UserProfile, Branch } from '../../../../core/models/api.models';
import type { RoleDefinition } from '../../../../core/models/rbac.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Usuarios</h1>
        <p class="subtitle">Roles  · crear empleados de sucursal (encargado/cajero).</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openEmployeeModal()">Nuevo empleado</button>
      }
    </header>

    @if (loading()) { <p>Cargando…</p> }
    @else if (!users().length) {
      <app-empty-state icon="👤" title="Sin usuarios" description="Crea empleados o registra clientes desde e-commerce." />
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th></tr></thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td>{{ u.first_name }} {{ u.last_name }}</td>
                <td>{{ u.email }}</td>
                <td>
                  @if (canManage() && u.role !== 'CUSTOMER') {
                    <select [value]="u.role" (change)="changeRole(u, $event)" [disabled]="savingId() === u.id">
                      @for (r of assignableRoles(); track r.code) {
                        <option [value]="r.code">{{ r.name }}</option>
                      }
                    </select>
                  } @else {
                    <span class="badge">{{ roleLabel(u.role) }}</span>
                  }
                </td>
                <td>{{ u.is_active ? 'Activo' : 'Inactivo' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (employeeModal()) {
      <div class="modal-backdrop" (click)="employeeModal.set(false)">
        <div class="modal wide" role="dialog" (click)="$event.stopPropagation()">
          <h2>Nuevo empleado</h2>
          <form [formGroup]="employeeForm" (ngSubmit)="createEmployee()">
            <div class="form-row">
              <label>Nombre <input formControlName="first_name" /></label>
              <label>Apellido <input formControlName="last_name" /></label>
            </div>
            <label>Email <input type="email" formControlName="email" /></label>
            <label>Contraseña <input type="password" formControlName="password" /></label>
            <div class="form-row">
              <label>Rol
                <select formControlName="role">
                  @for (r of assignableRoles(); track r.code) {
                    <option [value]="r.code">{{ r.name }}</option>
                  }
                </select>
              </label>
              <label>Puesto
                <select formControlName="position">
                  @for (p of positions; track p.value) {
                    <option [value]="p.value">{{ p.label }}</option>
                  }
                </select>
              </label>
            </div>
            <div class="form-row">
              <label>Sucursal
                <select formControlName="branch">
                  @for (b of branches(); track b.id) { <option [value]="b.id">{{ b.name }}</option> }
                </select>
              </label>
              <label>Fecha ingreso <input type="date" formControlName="hire_date" /></label>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn--ghost" (click)="employeeModal.set(false)">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="employeeForm.invalid">Crear</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: ADMIN_CRUD_STYLES,
})
export class AdminUsersPageComponent implements OnInit {
  private readonly orgApi = inject(OrgApi);
  private readonly rbacApi = inject(RbacApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly positions = EMPLOYEE_POSITIONS;
  protected readonly loading = signal(true);
  protected readonly savingId = signal<number | null>(null);
  protected readonly employeeModal = signal(false);
  protected readonly users = signal<UserProfile[]>([]);
  protected readonly roles = signal<RoleDefinition[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('accounts.users.manage'));
  protected readonly assignableRoles = computed(() =>
    this.roles().filter((r) => r.is_active && r.code !== 'CUSTOMER'),
  );

  protected readonly employeeForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    role: ['CASHIER', Validators.required],
    position: ['CASHIER', Validators.required],
    branch: ['', Validators.required],
    hire_date: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  ngOnInit(): void { void this.load(); }

  roleLabel(role: string): string {
    return this.roles().find((r) => r.code === role)?.name ?? role;
  }

  openEmployeeModal(): void {
    this.employeeForm.reset({
      email: '', password: '', first_name: '', last_name: '',
      role: 'CASHIER', position: 'CASHIER',
      branch: String(this.branches()[0]?.id ?? ''),
      hire_date: new Date().toISOString().slice(0, 10),
    });
    this.employeeModal.set(true);
  }

  async createEmployee(): Promise<void> {
    if (this.employeeForm.invalid || !this.canManage()) return;
    const raw = this.employeeForm.getRawValue();
    try {
      await firstValueFrom(this.orgApi.createEmployee({
        ...raw,
        branch: Number(raw.branch),
      }));
      this.notifications.success('Empleado creado');
      this.employeeModal.set(false);
      await this.loadUsers();
    } catch { this.notifications.error('No se pudo crear el empleado'); }
  }

  async changeRole(user: UserProfile, event: Event): Promise<void> {
    const role = (event.target as HTMLSelectElement).value;
    if (role === user.role || !this.canManage()) return;
    this.savingId.set(user.id);
    try {
      const updated = await firstValueFrom(this.orgApi.updateUser(user.id, { role }));
      this.users.update((list) => list.map((u) => (u.id === user.id ? updated : u)));
      this.notifications.success(`Rol actualizado a ${this.roleLabel(role)}`);
    } catch {
      this.notifications.error('No se pudo cambiar el rol');
      (event.target as HTMLSelectElement).value = user.role;
    } finally { this.savingId.set(null); }
  }

  private async load(): Promise<void> {
    try {
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        firstValueFrom(this.orgApi.listUsers()),
        firstValueFrom(this.rbacApi.listRoles({ ordering: 'name' })),
        firstValueFrom(this.orgApi.listBranches()),
      ]);
      this.users.set(usersRes.results);
      this.roles.set(rolesRes.results);
      this.branches.set(branchesRes.results);
    } finally { this.loading.set(false); }
  }

  private async loadUsers(): Promise<void> {
    const res = await firstValueFrom(this.orgApi.listUsers());
    this.users.set(res.results);
  }
}
