import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { SuppliersApi } from '../api/suppliers.api';

/** Contexto operativo para encargados/cajeros: sucursal asignada en JWT. */
@Injectable({ providedIn: 'root' })
export class StaffContextService {
  private readonly auth = inject(AuthService);
  private readonly suppliersApi = inject(SuppliersApi);

  private readonly _supplierId = signal<number | null>(null);

  readonly branchId = computed(() => this.auth.user()?.branch_id ?? null);
  readonly supplierId = this._supplierId.asReadonly();
  readonly isBranchStaff = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'BRANCH_MANAGER' || role === 'CASHIER';
  });
  readonly isSupplier = computed(() => this.auth.user()?.role === 'SUPPLIER');

  /** Resolves supplier pk for SUPPLIER portal users (cached). */
  async resolveSupplierId(): Promise<number | null> {
    if (!this.isSupplier()) return null;
    const cached = this._supplierId();
    if (cached !== null) return cached;
    try {
      const res = await firstValueFrom(this.suppliersApi.listSuppliers());
      const id = res.results[0]?.id ?? null;
      this._supplierId.set(id);
      return id;
    } catch {
      return null;
    }
  }
}
