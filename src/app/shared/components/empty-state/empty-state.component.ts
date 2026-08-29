import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <div class="empty__icon" aria-hidden="true">{{ icon() }}</div>
      <h3>{{ title() }}</h3>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty {
      text-align: center;
      padding: 3rem 1.5rem;
      color: var(--color-muted);
    }
    .empty__icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }
    h3 {
      font-family: var(--font-display);
      font-size: 1.25rem;
      color: var(--color-text);
      margin: 0 0 0.5rem;
    }
    p {
      margin: 0 auto 1rem;
      max-width: 28rem;
      line-height: 1.6;
    }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly icon = input<string>('✨');
}
