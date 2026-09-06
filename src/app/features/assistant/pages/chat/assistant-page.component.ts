import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { AiApi, type ChatMessage } from '../../../../core/api/ai.api';
import { BranchContextService } from '../../../../core/services/branch-context.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-assistant-page',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Asistente de moda</h1>
    <p class="subtitle">Recomendaciones según temporada, talla y disponibilidad en tu sucursal</p>

    <div class="chat" role="log" aria-live="polite">
      @for (msg of messages(); track $index) {
        <div class="bubble" [class.bubble--user]="msg.role === 'user'">{{ msg.content }}</div>
      }
      @if (loading()) { <p class="typing">Pensando…</p> }
    </div>

    <form class="input-row" (submit)="send($event)">
      <label class="sr-only" for="prompt">Consulta</label>
      <input id="prompt" type="text" placeholder="Ej: ¿Qué camisa me recomiendas talla M?" [(ngModel)]="prompt" name="prompt" [disabled]="loading()" />
      <button type="submit" class="btn btn--primary" [disabled]="loading() || !prompt.trim()">Enviar</button>
    </form>
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0; }
    .subtitle { color: var(--color-muted); margin: 0.25rem 0 1rem; }
    .chat {
      border: 1px solid var(--color-border); border-radius: 0.875rem;
      padding: 1rem; background: var(--color-surface); min-height: 16rem; max-height: 28rem; overflow-y: auto;
      display: grid; gap: 0.5rem; margin-bottom: 0.75rem;
    }
    .bubble { max-width: 85%; padding: 0.625rem 0.875rem; border-radius: 0.75rem; background: var(--color-surface-2); font-size: 0.9375rem; line-height: 1.5; }
    .bubble--user { justify-self: end; background: color-mix(in srgb, var(--color-accent) 12%, white); }
    .typing { color: var(--color-muted); font-size: 0.875rem; margin: 0; }
    .input-row { display: flex; gap: 0.5rem; }
    input { flex: 1; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.625rem; font: inherit; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
  `,
})
export class AssistantPageComponent {
  private readonly aiApi = inject(AiApi);
  private readonly branchContext = inject(BranchContextService);
  private readonly notifications = inject(NotificationService);

  protected prompt = '';
  protected readonly messages = signal<ChatMessage[]>([
    { role: 'assistant', content: '¡Hola! Pregúntame por outfits, tallas o disponibilidad en tu sucursal.' },
  ]);
  protected readonly loading = signal(false);

  async send(event: Event): Promise<void> {
    event.preventDefault();
    const text = this.prompt.trim();
    if (!text || this.loading()) return;

    const history = [...this.messages(), { role: 'user' as const, content: text }];
    this.messages.set(history);
    this.prompt = '';
    this.loading.set(true);

    try {
      const res = await firstValueFrom(
        this.aiApi.chat(history.filter((m) => m.role === 'user' || m.role === 'assistant'), this.branchContext.selectedBranchId() ?? undefined),
      );
      this.messages.update((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch {
      this.messages.update((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'El servicio de IA no está disponible aún. Usa los filtros del catálogo o visita /ecommerce/asistente cuando el backend exponga POST /ai/chat/.',
        },
      ]);
      this.notifications.warn('Servicio IA no disponible');
    } finally {
      this.loading.set(false);
    }
  }
}
