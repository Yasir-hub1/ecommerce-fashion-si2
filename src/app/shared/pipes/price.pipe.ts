import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'price', standalone: true })
export class PricePipe implements PipeTransform {
  transform(value: string | number | null | undefined, currency = 'BOB'): string {
    if (value == null || value === '') return `Bs 0,00`;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num)) return `Bs 0,00`;
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(num);
  }
}
