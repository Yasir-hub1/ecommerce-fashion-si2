import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-assistant-page',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Asistente de moda</h1>
    <p class="subtitle">Recomendaciones inteligentes según temporada, talla y disponibilidad</p>

    <div class="chat">
      <app-empty-state
        icon="🤖"
        title="Chat IA"
        description="El endpoint POST /ai/chat/ estará disponible cuando el backend exponga el módulo de IA. Mientras tanto, explora el catálogo con filtros por sucursal."
      />
      <label class="input-row">
        <span class="sr-only">Escribe tu consulta</span>
        <input type="text" placeholder="Ej: ¿Qué camisa me recomiendas para verano talla M?" [(ngModel)]="prompt" disabled />
        <button type="button" class="btn btn--primary" disabled>Enviar</button>
      </label>
      <p class="note">Limitación conocida: el servicio de voz requiere Chromium; aquí se usará texto.</p>
    </div>
  `,
  styles: `
    .page-title { font-family: var(--font-display); margin: 0; }
    .subtitle { color: var(--color-muted); margin: 0.25rem 0 1rem; }
    .chat {
      border: 1px solid var(--color-border); border-radius: 0.875rem;
      padding: 1rem; background: var(--color-surface);
    }
    .input-row { display: flex; gap: 0.5rem; margin-top: 1rem; }
    input { flex: 1; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.625rem; font: inherit; }
    .note { font-size: 0.8125rem; color: var(--color-muted); margin: 0.75rem 0 0; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
  `,
})
export class AssistantPageComponent {
  protected prompt = '';
  protected readonly messages = signal<{ role: 'user' | 'bot'; text: string }[]>([]);
}
