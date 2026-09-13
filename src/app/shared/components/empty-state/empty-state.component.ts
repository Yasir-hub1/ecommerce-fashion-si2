import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty anim-rise">
      @if (icon()) {
        <div class="empty__icon" aria-hidden="true">{{ icon() }}</div>
      } @else {
        <div class="empty__mark" aria-hidden="true"></div>
      }
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
      padding: 3.25rem 1.5rem;
      color: var(--color-muted);
      border: 1px dashed var(--color-border);
      background: color-mix(in srgb, var(--color-surface) 70%, transparent);
    }
    .empty__icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty__mark {
      width: 2.5rem; height: 2.5rem; margin: 0 auto 0.9rem;
      border: 2px solid var(--color-accent);
      transform: rotate(12deg);
    }
    h3 {
      font-family: var(--font-display);
      font-size: 1.35rem;
      letter-spacing: -0.03em;
      color: var(--color-text);
      margin: 0 0 0.5rem;
    }
    p {
      margin: 0 auto 1.1rem;
      max-width: 28rem;
      line-height: 1.6;
    }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly icon = input<string>('');
}
