import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warn';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.push(message, 'success');
  }

  error(message: string): void {
    this.push(message, 'error');
  }

  info(message: string): void {
    this.push(message, 'info');
  }

  warn(message: string): void {
    this.push(message, 'warn');
  }

  dismiss(id: number): void {
    this.toasts.update((items) => items.filter((t) => t.id !== id));
  }

  private push(message: string, type: Toast['type']): void {
    const id = ++this.nextId;
    this.toasts.update((items) => [...items, { id, message, type }]);
    setTimeout(() => this.dismiss(id), 5000);
  }
}
