import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { OrgApi } from '../api/catalog-admin.api';
import { AuthService } from '../auth/auth.service';
import type { Branch } from '../models/api.models';

/** POS branch context: staff use assigned branch; admin picks a branch. */
@Injectable({ providedIn: 'root' })
export class PosBranchService {
  private readonly auth = inject(AuthService);
  private readonly orgApi = inject(OrgApi);

  private readonly _branches = signal<Branch[]>([]);
  private readonly _selectedBranchId = signal<number | null>(null);
  private readonly _loaded = signal(false);

  readonly branches = this._branches.asReadonly();
  readonly selectedBranchId = this._selectedBranchId.asReadonly();

  readonly needsBranchPicker = computed(() => {
    const user = this.auth.user();
    if (!user) return false;
    return user.role === 'ADMIN' || user.branch_id == null;
  });

  readonly effectiveBranchId = computed(() => {
    const user = this.auth.user();
    if (user?.branch_id) return user.branch_id;
    return this._selectedBranchId();
  });

  readonly branchQueryParams = computed(() => {
    const id = this.effectiveBranchId();
    return id != null ? { branch_id: id } : {};
  });

  async ensureReady(): Promise<void> {
    if (this._loaded()) return;

    const user = this.auth.user();
    if (user?.branch_id) {
      this._selectedBranchId.set(user.branch_id);
      this._loaded.set(true);
      return;
    }

    if (this.needsBranchPicker()) {
      const res = await firstValueFrom(this.orgApi.listBranches({ page_size: 100 }));
      this._branches.set(res.results);
      if (!this._selectedBranchId() && res.results[0]) {
        this._selectedBranchId.set(res.results[0].id);
      }
    }

    this._loaded.set(true);
  }

  selectBranch(branchId: number): void {
    this._selectedBranchId.set(branchId);
  }
}
