import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { RbacApi } from '../../../../core/api/rbac.api';
import type { AppPermission, RoleDefinition } from '../../../../core/models/rbac.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-admin-roles-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Roles</h1>
        <p class="subtitle">Define roles y asigna permisos a cada perfil de acceso.</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openCreate()">Nuevo rol</button>
      }
    </header>

    @if (loading()) {
      <p>Cargando roles…</p>
    } @else if (!roles().length) {
      <app-empty-state icon="🔐" title="Sin roles" description="Crea roles personalizados para tu equipo." />
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Permisos</th>
              <th>Usuarios</th>
              <th>Tipo</th>
              @if (canManage()) { <th></th> }
            </tr>
          </thead>
          <tbody>
            @for (role of roles(); track role.id) {
              <tr>
                <td><code>{{ role.code }}</code></td>
                <td>{{ role.name }}</td>
                <td>{{ role.permission_count }}</td>
                <td>{{ role.user_count }}</td>
                <td>{{ role.is_system ? 'Sistema' : 'Personalizado' }}</td>
                @if (canManage()) {
                  <td class="actions">
                    <button type="button" class="btn btn--ghost" (click)="openEdit(role)">Editar</button>
                    @if (!role.is_system) {
                      <button type="button" class="btn btn--ghost danger" (click)="remove(role)">Eliminar</button>
                    }
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
        <div class="modal" role="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editingId() ? 'Editar rol' : 'Nuevo rol' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label>
              Código
              <input formControlName="code" [readonly]="!!editingId() && editingSystem()" />
            </label>
            <label>
              Nombre
              <input formControlName="name" />
            </label>
            <label>
              Descripción
              <textarea formControlName="description" rows="2"></textarea>
            </label>

            <fieldset>
              <legend>Permisos</legend>
              <div class="perm-grid">
                @for (perm of allPermissions(); track perm.id) {
                  <label class="perm-check">
                    <input
                      type="checkbox"
                      [checked]="selectedPermissionIds().has(perm.id)"
                      (change)="togglePermission(perm.id, $event)"
                    />
                    <span>
                      <strong>{{ perm.name }}</strong>
                      <small>{{ perm.code }}</small>
                    </span>
                  </label>
                }
              </div>
            </fieldset>

            <div class="modal-actions">
              <button type="button" class="btn btn--ghost" (click)="closeEditor()">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">
                {{ saving() ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: `
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .page-title { font-family: var(--font-display); margin: 0; }
    .subtitle { color: var(--color-muted); margin: 0.25rem 0 0; font-size: 0.875rem; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: 0.875rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--color-border); vertical-align: top; }
    th { background: var(--color-surface-2); }
    code { font-size: 0.8125rem; background: var(--color-surface-2); padding: 0.15rem 0.4rem; border-radius: 0.375rem; }
    .actions { display: flex; gap: 0.375rem; flex-wrap: wrap; }
    .danger { color: #b91c1c; }
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: grid; place-items: center; z-index: 100; padding: 1rem;
    }
    .modal {
      width: min(640px, 100%); max-height: 90dvh; overflow: auto;
      background: var(--color-surface); border-radius: 1rem; padding: 1.25rem;
      border: 1px solid var(--color-border);
    }
    .modal h2 { margin: 0 0 1rem; font-family: var(--font-display); }
    form { display: grid; gap: 0.875rem; }
    label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
    input, textarea {
      border: 1px solid var(--color-border); border-radius: 0.625rem;
      padding: 0.625rem 0.75rem; font: inherit; background: var(--color-bg);
    }
    fieldset { border: 1px solid var(--color-border); border-radius: 0.625rem; padding: 0.75rem; margin: 0; }
    legend { padding: 0 0.375rem; font-size: 0.8125rem; font-weight: 600; }
    .perm-grid { display: grid; gap: 0.5rem; max-height: 16rem; overflow: auto; }
    .perm-check { display: flex; gap: 0.5rem; align-items: flex-start; font-weight: 400; cursor: pointer; }
    .perm-check small { display: block; color: var(--color-muted); font-size: 0.75rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
  `,
})
export class AdminRolesPageComponent implements OnInit {
  private readonly rbacApi = inject(RbacApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly editingSystem = signal(false);
  protected readonly roles = signal<RoleDefinition[]>([]);
  protected readonly allPermissions = signal<AppPermission[]>([]);
  protected readonly selectedPermissionIds = signal(new Set<number>());
  protected readonly canManage = computed(() => this.permissions.has('rbac.roles.manage'));

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
    name: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    void this.load();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.editingSystem.set(false);
    this.form.reset({ code: '', name: '', description: '' });
    this.selectedPermissionIds.set(new Set());
    this.editorOpen.set(true);
  }

  openEdit(role: RoleDefinition): void {
    this.editingId.set(role.id);
    this.editingSystem.set(role.is_system);
    this.form.patchValue({
      code: role.code,
      name: role.name,
      description: role.description ?? '',
    });
    this.selectedPermissionIds.set(new Set(role.permissions.map((p) => p.id)));
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  togglePermission(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedPermissionIds());
    if (checked) next.add(id);
    else next.delete(id);
    this.selectedPermissionIds.set(next);
  }

  async save(): Promise<void> {
    if (this.form.invalid || !this.canManage()) return;
    this.saving.set(true);
    const { code, name, description } = this.form.getRawValue();
    const permissionIds = [...this.selectedPermissionIds()];

    try {
      const id = this.editingId();
      if (id) {
        await firstValueFrom(
          this.rbacApi.updateRole(id, { name, description: description || undefined }),
        );
        await firstValueFrom(this.rbacApi.replaceRolePermissions(id, permissionIds));
        this.notifications.success('Rol actualizado');
      } else {
        const created = await firstValueFrom(
          this.rbacApi.createRole({
            code,
            name,
            description: description || undefined,
            permission_ids: permissionIds,
          }),
        );
        if (permissionIds.length) {
          await firstValueFrom(this.rbacApi.replaceRolePermissions(created.id, permissionIds));
        }
        this.notifications.success('Rol creado');
      }
      this.closeEditor();
      await this.loadRoles();
    } catch {
      this.notifications.error('No se pudo guardar el rol');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(role: RoleDefinition): Promise<void> {
    if (role.is_system || !confirm(`¿Eliminar el rol ${role.name}?`)) return;
    try {
      await firstValueFrom(this.rbacApi.deleteRole(role.id));
      this.notifications.info('Rol eliminado');
      await this.loadRoles();
    } catch {
      this.notifications.error('No se pudo eliminar el rol');
    }
  }

  private async load(): Promise<void> {
    try {
      await Promise.all([this.loadRoles(), this.loadPermissions()]);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadRoles(): Promise<void> {
    const res = await firstValueFrom(this.rbacApi.listRoles({ ordering: 'name' }));
    this.roles.set(res.results);
  }

  private async loadPermissions(): Promise<void> {
    const res = await firstValueFrom(this.rbacApi.listPermissions({ ordering: 'module' }));
    this.allPermissions.set(res.results);
  }
}
