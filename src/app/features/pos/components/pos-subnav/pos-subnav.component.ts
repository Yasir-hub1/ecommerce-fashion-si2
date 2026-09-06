import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { PosBranchService } from '../../../../core/services/pos-branch.service';

@Component({
  selector: 'app-pos-subnav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="pos-nav" aria-label="POS">
      <a routerLink="/admin/pos" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Caja</a>
      <a routerLink="/admin/pos/ventas" routerLinkActive="active">Ventas del día</a>
      <a routerLink="/admin/pos/buscar" routerLinkActive="active">Buscar</a>

      @if (posBranch.needsBranchPicker()) {
        <label class="branch-picker">
          Sucursal
          <select
            [value]="posBranch.effectiveBranchId() ?? ''"
            (change)="onBranchChange($event)"
          >
            @for (b of posBranch.branches(); track b.id) {
              <option [value]="b.id">{{ b.name }} ({{ b.code }})</option>
            }
          </select>
        </label>
      }
    </nav>
  `,
  styles: `
    .pos-nav {
      display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;
    }
    a {
      padding: 0.4rem 0.875rem; border-radius: 999px; text-decoration: none;
      font-size: 0.875rem; font-weight: 500; color: var(--color-muted);
      border: 1px solid var(--color-border); background: var(--color-surface);
    }
    a.active { color: var(--color-accent); border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 8%, white); }
    .branch-picker {
      margin-left: auto; display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.8125rem; color: var(--color-muted);
    }
    .branch-picker select {
      border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.35rem 0.5rem;
      font: inherit; background: var(--color-surface);
    }
  `,
})
export class PosSubnavComponent implements OnInit {
  protected readonly posBranch = inject(PosBranchService);

  ngOnInit(): void {
    void this.posBranch.ensureReady();
  }

  onBranchChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (value) this.posBranch.selectBranch(value);
  }
}
