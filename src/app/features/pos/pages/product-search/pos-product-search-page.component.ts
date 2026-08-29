import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CatalogApi } from '../../../../core/api/auth.api';
import type { ProductListItem } from '../../../../core/models/api.models';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-pos-product-search-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Buscar producto</h1>
    <div class="search">
      <input type="text" placeholder="Nombre, SKU o código…" [(ngModel)]="query" (keydown.enter)="search()" />
      <button type="button" class="btn btn--primary" (click)="search()">Buscar</button>
    </div>
    @for (p of results(); track p.id) {
      <a [routerLink]="['/ecommerce/producto', p.id]" class="result">{{ p.name }} · {{ p.base_price | price }}</a>
    }
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0 0 1rem; }
    .search { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    input { flex: 1; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.625rem; font: inherit; }
    .result {
      display: block; padding: 0.75rem 1rem; margin-bottom: 0.375rem;
      border: 1px solid var(--color-border); border-radius: 0.625rem;
      text-decoration: none; color: inherit; background: var(--color-surface);
    }
  `,
})
export class PosProductSearchPageComponent {
  private readonly catalogApi = inject(CatalogApi);
  protected query = '';
  protected readonly results = signal<ProductListItem[]>([]);

  async search(): Promise<void> {
    if (!this.query.trim()) return;
    const res = await firstValueFrom(this.catalogApi.listProducts({ search: this.query.trim() }));
    this.results.set(res.results.slice(0, 12));
  }
}
