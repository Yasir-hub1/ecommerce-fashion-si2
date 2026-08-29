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
      border-radius: 0.75rem;
      font-size: 0.875rem;
      line-height: 1.4;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
      animation: slideIn 0.25s ease;
    }
    .toast button {
      background: none;
      border: none;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      opacity: 0.7;
    }
    .toast--success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .toast--error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .toast--info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .toast--warn { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
    @keyframes slideIn {
      from { transform: translateX(1rem); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `,
})
export class ToastComponent {
  protected readonly notifications = inject(NotificationService);
}
