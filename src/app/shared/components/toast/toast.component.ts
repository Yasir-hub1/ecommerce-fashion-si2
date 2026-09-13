import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of notifications.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.type }}" role="alert">
          <span>{{ toast.message }}</span>
          <button type="button" (click)="notifications.dismiss(toast.id)" aria-label="Cerrar">
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: min(24rem, calc(100vw - 2rem));
    }
    .toast {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      font-size: 0.875rem;
      line-height: 1.4;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      box-shadow: var(--shadow-lift);
      animation: veta-rise 0.28s var(--ease-out);
      border-left-width: 3px;
    }
    .toast button {
      background: none;
      border: none;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      opacity: 0.7;
      color: inherit;
    }
    .toast--success { border-left-color: var(--color-teal); color: #0b4f48; }
    .toast--error { border-left-color: var(--color-danger); color: var(--color-danger); }
    .toast--info { border-left-color: var(--color-ink); color: var(--color-ink); }
    .toast--warn { border-left-color: var(--color-warn); color: var(--color-warn); }
  `,
})
export class ToastComponent {
  protected readonly notifications = inject(NotificationService);
}
