import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

import type { Branch } from '../models/api.models';
import { BranchesApi } from '../api/branches.api';

const STORAGE_KEY = 'fs_selected_branch';

@Injectable({ providedIn: 'root' })
export class BranchContextService {
  private readonly branchesApi = inject(BranchesApi);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _branches = signal<Branch[]>([]);
  private readonly _selectedBranchId = signal<number | null>(null);
  private readonly _loading = signal(false);

  readonly branches = this._branches.asReadonly();
  readonly selectedBranchId = this._selectedBranchId.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly selectedBranch = computed(() => {
    const id = this._selectedBranchId();
    return this._branches().find((b) => b.id === id) ?? null;
  });

  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this._loading.set(true);
    try {
      const branches = await firstValueFrom(this.branchesApi.list());
      this._branches.set(branches.results.filter((b) => b.is_active));

      const stored = localStorage.getItem(STORAGE_KEY);
      const storedId = stored ? Number(stored) : null;
      const valid = this._branches().some((b) => b.id === storedId);

      if (valid && storedId) {
        this._selectedBranchId.set(storedId);
      } else if (this._branches().length > 0) {
        this.selectBranch(this._branches()[0].id);
      }
    } finally {
      this._loading.set(false);
    }
  }

  selectBranch(id: number): void {
    this._selectedBranchId.set(id);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  }
}
