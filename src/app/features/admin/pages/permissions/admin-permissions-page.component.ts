import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { RbacApi } from '../../../../core/api/rbac.api';
import type { AppPermission } from '../../../../core/models/rbac.models';
import { PermissionService } from '../../../../core/services/permission.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-admin-permissions-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Permisos</h1>
        <p class="subtitle">Catálogo de permisos granulares del sistema.</p>
      </div>
      @if (canManage()) {
        <button type="button" class="btn btn--primary" (click)="openCreate()">Nuevo permiso</button>
      }
    </header>

    @if (loading()) {
      <p>Cargando permisos…</p>
    } @else if (!items().length) {
      <app-empty-state icon="🧩" title="Sin permisos" description="Los permisos del sistema se cargan desde el backend." />
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Módulo</th><th>Código</th><th>Nombre</th><th>Estado</th>@if (canManage()) { <th></th> }</tr>
          </thead>
          <tbody>
            @for (p of items(); track p.id) {
              <tr>
                <td>{{ p.module }}</td>
                <td><code>{{ p.code }}</code></td>
                <td>{{ p.name }}</td>
                <td>{{ p.is_active ? 'Activo' : 'Inactivo' }}</td>
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
        <div class="modal" role="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editingId() ? 'Editar permiso' : 'Nuevo permiso' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label>
              Código
              <input formControlName="code" placeholder="modulo.recurso.accion" />
            </label>
            <label>
              Nombre
              <input formControlName="name" />
            </label>
            <label>
              Módulo
              <input formControlName="module" />
            </label>
            <label>
              Descripción
              <textarea formControlName="description" rows="2"></textarea>
            </label>
            <label class="inline">
              <input type="checkbox" formControlName="is_active" />
              Activo
            </label>
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
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--color-border); }
    th { background: var(--color-surface-2); }
    code { font-size: 0.8125rem; background: var(--color-surface-2); padding: 0.15rem 0.4rem; border-radius: 0.375rem; }
    .actions { display: flex; gap: 0.375rem; }
    .danger { color: #b91c1c; }
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: grid; place-items: center; z-index: 100; padding: 1rem;
    }
    .modal {
      width: min(480px, 100%); background: var(--color-surface);
      border-radius: 1rem; padding: 1.25rem; border: 1px solid var(--color-border);
    }
    .modal h2 { margin: 0 0 1rem; font-family: var(--font-display); }
    form { display: grid; gap: 0.875rem; }
    label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
    label.inline { display: flex; align-items: center; gap: 0.5rem; font-weight: 400; }
    input, textarea {
      border: 1px solid var(--color-border); border-radius: 0.625rem;
      padding: 0.625rem 0.75rem; font: inherit; background: var(--color-bg);
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
  `,
})
export class AdminPermissionsPageComponent implements OnInit {
  private readonly rbacApi = inject(RbacApi);
  private readonly permissions = inject(PermissionService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly items = signal<AppPermission[]>([]);
  protected readonly canManage = computed(() => this.permissions.has('rbac.permissions.manage'));

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[\w.]+$/)]],
    name: ['', Validators.required],
    module: ['', Validators.required],
    description: [''],
    is_active: [true],
  });

  ngOnInit(): void {
    void this.load();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ code: '', name: '', module: '', description: '', is_active: true });
    this.editorOpen.set(true);
  }

  openEdit(perm: AppPermission): void {
    this.editingId.set(perm.id);
    this.form.patchValue({
      code: perm.code,
      name: perm.name,
      module: perm.module,
      description: perm.description ?? '',
      is_active: perm.is_active,
    });
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  async save(): Promise<void> {
    if (this.form.invalid || !this.canManage()) return;
    this.saving.set(true);
    const body = this.form.getRawValue();
    const id = this.editingId();

    try {
      if (id) {
        await firstValueFrom(this.rbacApi.updatePermission(id, body));
        this.notifications.success('Permiso actualizado');
      } else {
        await firstValueFrom(this.rbacApi.createPermission(body));
        this.notifications.success('Permiso creado');
      }
      this.closeEditor();
      await this.load();
    } catch {
      this.notifications.error('No se pudo guardar el permiso');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(perm: AppPermission): Promise<void> {
    if (!confirm(`¿Eliminar el permiso ${perm.code}?`)) return;
    try {
      await firstValueFrom(this.rbacApi.deletePermission(perm.id));
      this.notifications.info('Permiso eliminado');
      await this.load();
    } catch {
      this.notifications.error('No se pudo eliminar el permiso');
    }
  }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.rbacApi.listPermissions({ ordering: 'module' }));
      this.items.set(res.results);
    } finally {
      this.loading.set(false);
    }
  }
}
