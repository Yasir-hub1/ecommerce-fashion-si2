import { Injectable, computed, signal } from '@angular/core';

export interface ReservationCartLine {
  variantId: number;
  productName: string;
  sku: string;
  sizeName: string;
  colorName: string;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class ReservationCartStore {
  private readonly _lines = signal<ReservationCartLine[]>([]);
  private readonly _scheduledFor = signal('');
  private readonly _notes = signal('');

  readonly lines = this._lines.asReadonly();
  readonly scheduledFor = this._scheduledFor.asReadonly();
  readonly notes = this._notes.asReadonly();
  readonly totalItems = computed(() =>
    this._lines().reduce((sum, l) => sum + l.quantity, 0),
  );

  addLine(line: ReservationCartLine): void {
    this._lines.update((items) => {
      const existing = items.find((i) => i.variantId === line.variantId);
      if (existing) {
        return items.map((i) =>
          i.variantId === line.variantId
            ? { ...i, quantity: i.quantity + line.quantity }
            : i,
        );
      }
      return [...items, line];
    });
  }

  updateQty(variantId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeLine(variantId);
      return;
    }
    this._lines.update((items) =>
      items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
    );
  }

  removeLine(variantId: number): void {
    this._lines.update((items) => items.filter((i) => i.variantId !== variantId));
  }

  setSchedule(value: string): void {
    this._scheduledFor.set(value);
  }

  setNotes(value: string): void {
    this._notes.set(value);
  }

  clear(): void {
    this._lines.set([]);
    this._scheduledFor.set('');
    this._notes.set('');
  }
}
