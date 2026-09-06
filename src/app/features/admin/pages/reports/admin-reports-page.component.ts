import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { ReportsApi, downloadCsvBlob, type ReportRequest, type ReportSummary } from '../../../../core/api/reports.api';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { ADMIN_CRUD_STYLES } from '../../../../shared/styles/admin-crud.styles';

type ReportTab = 'summary' | 'generative' | 'voice';

const EXPORT_TYPES = [
  { type: 'sales', label: 'Ventas (CSV)' },
  { type: 'inventory', label: 'Inventario (CSV)' },
  { type: 'reservations', label: 'Reservas (CSV)' },
] as const;

interface SpeechRecognitionResultLike {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): { transcript: string };
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResultLike };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

@Component({
  selector: 'app-admin-reports-page',
  standalone: true,
  imports: [ReactiveFormsModule, EmptyStateComponent, PricePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Reportes</h1>
        <p class="subtitle">Indicadores, análisis generativo y exportación de datos.</p>
      </div>
      <div class="export-actions">
        @for (e of exportTypes; track e.type) {
          <button type="button" class="btn btn--ghost" (click)="exportReport(e.type)">{{ e.label }}</button>
        }
      </div>
    </header>

    @if (apiUnavailable()) {
      <app-empty-state
        icon="📊"
        title="Módulo no disponible"
        description="El backend de reportes aún no está desplegado. Las pestañas y exportaciones estarán activas cuando el endpoint /reports/ responda."
      />
    } @else {
      <nav class="tabs" aria-label="Secciones de reportes">
        @for (t of tabs; track t.id) {
          <button
            type="button"
            class="tab"
            [class.active]="activeTab() === t.id"
            (click)="setTab(t.id)"
          >{{ t.label }}</button>
        }
      </nav>

      @switch (activeTab()) {
        @case ('summary') {
          @if (summaryLoading()) { <p>Cargando resumen…</p> }
          @else if (summary()) {
            <div class="summary-grid">
              <article class="stat-card">
                <span class="stat-label">Ventas totales</span>
                <strong class="stat-value">{{ summary()!.total_sales | price }}</strong>
              </article>
              <article class="stat-card">
                <span class="stat-label">Pedidos</span>
                <strong class="stat-value">{{ summary()!.order_count }}</strong>
              </article>
              <article class="stat-card">
                <span class="stat-label">Reservas</span>
                <strong class="stat-value">{{ summary()!.reservation_count }}</strong>
              </article>
              <article class="stat-card">
                <span class="stat-label">Conversión</span>
                <strong class="stat-value">{{ (summary()!.conversion_rate * 100) | number:'1.1-1' }}%</strong>
              </article>
              <article class="stat-card">
                <span class="stat-label">Stock bajo</span>
                <strong class="stat-value">{{ summary()!.low_stock_count }}</strong>
              </article>
            </div>
            @if (summary()!.top_products.length) {
              <h2 class="section-title">Top productos</h2>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Producto</th><th>Unidades</th><th>Ingresos</th></tr></thead>
                  <tbody>
                    @for (p of summary()!.top_products; track p.product_name) {
                      <tr>
                        <td>{{ p.product_name }}</td>
                        <td>{{ p.units_sold }}</td>
                        <td>{{ p.revenue | price }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        }
        @case ('generative') {
          <form class="gen-form" [formGroup]="promptForm" (ngSubmit)="generateFromPrompt()">
            <label>
              Describe el reporte que necesitas
              <textarea formControlName="prompt" rows="5" placeholder="Ej.: Ventas por sucursal la última semana…"></textarea>
            </label>
            <button type="submit" class="btn btn--primary" [disabled]="generating() || !promptForm.value.prompt?.trim()">
              {{ generating() ? 'Generando…' : 'Generar reporte' }}
            </button>
          </form>
          @if (lastReport()) {
            <article class="result-box">
              <h2 class="section-title">Resultado</h2>
              <pre>{{ lastReport()!.result_text }}</pre>
              <p class="meta">{{ lastReport()!.report_type }} · {{ lastReport()!.status }} · {{ lastReport()!.created_at }}</p>
            </article>
          }
        }
        @case ('voice') {
          @if (!speechSupported()) {
            <app-empty-state
              icon="🎤"
              title="Voz no disponible"
              description="Tu navegador no expone Web Speech API (SpeechRecognition). Usa la pestaña Generativo."
            />
          } @else {
            <p class="hint">Pulsa el micrófono y describe el reporte. El texto se enviará al generador.</p>
            <div class="voice-row">
              <button type="button" class="btn btn--primary" (click)="toggleListening()">
                {{ listening() ? 'Detener' : 'Escuchar' }}
              </button>
              @if (listening()) { <span class="badge live">Escuchando…</span> }
            </div>
            <label>
              Transcripción
              <textarea [value]="transcript()" rows="4" readonly placeholder="La transcripción aparecerá aquí…"></textarea>
            </label>
            <button
              type="button"
              class="btn btn--primary"
              [disabled]="generating() || !transcript().trim()"
              (click)="generateFromTranscript()"
            >{{ generating() ? 'Generando…' : 'Generar desde voz' }}</button>
          }
        }
      }
    }
  `,
  styles: [
    ADMIN_CRUD_STYLES,
    `
      .export-actions { display: flex; gap: 0.375rem; flex-wrap: wrap; }
      .summary-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.75rem; margin-bottom: 1.25rem;
      }
      .stat-card {
        padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.875rem;
        background: var(--color-surface); display: grid; gap: 0.25rem;
      }
      .stat-label { font-size: 0.75rem; color: var(--color-muted); }
      .stat-value { font-size: 1.25rem; }
      .section-title { font-family: var(--font-display); font-size: 1rem; margin: 1rem 0 0.5rem; }
      .gen-form { display: grid; gap: 0.75rem; max-width: 640px; }
      .result-box {
        margin-top: 1rem; padding: 1rem; border: 1px solid var(--color-border);
        border-radius: 0.875rem; background: var(--color-surface);
      }
      .result-box pre { white-space: pre-wrap; margin: 0; font-family: inherit; font-size: 0.875rem; }
      .meta { margin: 0.75rem 0 0; font-size: 0.75rem; color: var(--color-muted); }
      .hint { color: var(--color-muted); font-size: 0.875rem; margin: 0 0 0.75rem; }
      .voice-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
      .badge.live { background: #dc2626; color: white; }
    `,
  ],
})
export class AdminReportsPageComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApi);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly exportTypes = EXPORT_TYPES;
  protected readonly tabs = [
    { id: 'summary' as const, label: 'Resumen' },
    { id: 'generative' as const, label: 'Generativo' },
    { id: 'voice' as const, label: 'Voz' },
  ];

  protected readonly activeTab = signal<ReportTab>('summary');
  protected readonly apiUnavailable = signal(false);
  protected readonly summaryLoading = signal(true);
  protected readonly generating = signal(false);
  protected readonly listening = signal(false);
  protected readonly speechSupported = signal(false);
  protected readonly summary = signal<ReportSummary | null>(null);
  protected readonly lastReport = signal<ReportRequest | null>(null);
  protected readonly transcript = signal('');

  protected readonly promptForm = this.fb.group({ prompt: [''] });

  private recognition: SpeechRecognitionLike | null = null;

  ngOnInit(): void {
    this.speechSupported.set(typeof window !== 'undefined' && !!this.getSpeechCtor());
    void this.loadSummary();
  }

  setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
  }

  exportReport(type: string): void {
    void this.runExport(type);
  }

  private async runExport(type: string): Promise<void> {
    try {
      const blob = await firstValueFrom(this.reportsApi.exportCsv(type));
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsvBlob(blob, `${type}-${stamp}.csv`);
      this.notifications.success('Exportación descargada');
    } catch {
      /* errorInterceptor muestra el detalle del API */
    }
  }

  async generateFromPrompt(): Promise<void> {
    const prompt = this.promptForm.value.prompt?.trim();
    if (!prompt) return;
    await this.runGenerate(prompt);
  }

  async generateFromTranscript(): Promise<void> {
    const text = this.transcript().trim();
    if (!text) return;
    await this.runGenerate(text);
  }

  toggleListening(): void {
    if (this.listening()) {
      this.recognition?.stop();
      this.listening.set(false);
      return;
    }

    const Ctor = this.getSpeechCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = 'es-BO';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      this.transcript.set(text.trim());
    };
    recognition.onerror = () => {
      this.listening.set(false);
      this.notifications.error('Error al capturar voz');
    };
    recognition.onend = () => this.listening.set(false);

    this.recognition = recognition;
    this.listening.set(true);
    recognition.start();
  }

  private async runGenerate(prompt: string): Promise<void> {
    this.generating.set(true);
    try {
      const report = await firstValueFrom(this.reportsApi.generate({ prompt, report_type: 'GENERATIVE' }));
      this.lastReport.set(report);
      this.notifications.success('Reporte generado');
      this.setTab('generative');
      this.promptForm.patchValue({ prompt });
    } catch (err) {
      if (this.isNotFound(err)) {
        this.apiUnavailable.set(true);
        this.notifications.info('El servicio de reportes no está disponible');
      } else {
        this.notifications.error('No se pudo generar el reporte');
      }
    } finally {
      this.generating.set(false);
    }
  }

  private async loadSummary(): Promise<void> {
    try {
      const data = await firstValueFrom(this.reportsApi.summary());
      this.summary.set(data);
    } catch (err) {
      if (this.isNotFound(err)) {
        this.apiUnavailable.set(true);
      }
    } finally {
      this.summaryLoading.set(false);
    }
  }

  private isNotFound(err: unknown): boolean {
    return err instanceof HttpErrorResponse && err.status === 404;
  }

  private getSpeechCtor(): (new () => SpeechRecognitionLike) | undefined {
    const w = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition;
  }
}
