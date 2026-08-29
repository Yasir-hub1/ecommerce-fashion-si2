import { ChangeDetectionStrategy, Component, inject, input, OnDestroy, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-product-image-draft-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="draft">
      <legend>Imagen del producto</legend>
      <p class="hint">Opcional — se subirá al guardar. Vista previa antes de confirmar.</p>

      <label class="file-label">
        Archivo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          (change)="onFileChange($event)"
        />
      </label>

      @if (previewUrl()) {
        <figure class="preview">
          <img [src]="previewUrl()!" alt="Vista previa de la imagen del producto" />
          <figcaption>Vista previa — se subirá al guardar el producto</figcaption>
        </figure>
      }

      <label>Texto alternativo
        <input formControlName="alt_text" placeholder="Ej. Camisa oxford azul" />
      </label>
      <label class="inline">
        <input type="checkbox" formControlName="is_primary" />
        Marcar como imagen principal
      </label>
    </fieldset>
  `,
  styles: `
    .draft {
      border: 1px solid var(--color-border); border-radius: 0.75rem;
      padding: 0.875rem; margin: 0; display: grid; gap: 0.75rem;
    }
    legend { font-size: 0.875rem; font-weight: 600; padding: 0 0.25rem; }
    .hint { margin: 0; font-size: 0.8125rem; color: var(--color-muted); }
    label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
    label.inline { display: flex; align-items: center; gap: 0.5rem; font-weight: 400; }
    input[type='text'], input[type='file'] {
      border: 1px solid var(--color-border); border-radius: 0.625rem;
      padding: 0.625rem 0.75rem; font: inherit; background: var(--color-bg);
    }
    .preview {
      margin: 0; border: 1px solid var(--color-border); border-radius: 0.75rem;
      overflow: hidden; background: var(--color-surface-2);
    }
    .preview img { width: 100%; max-height: 200px; object-fit: contain; display: block; background: #111; }
    figcaption { padding: 0.5rem 0.75rem; font-size: 0.75rem; color: var(--color-muted); }
  `,
})
export class ProductImageDraftFieldComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);

  readonly disabled = input(false);

  readonly draftChange = output<{
    file: File | null;
    alt_text: string;
    is_primary: boolean;
  }>();

  protected readonly previewUrl = signal<string | null>(null);
  private pendingFile: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    alt_text: ['', Validators.required],
    is_primary: [true],
  });

  constructor() {
    this.form.valueChanges.subscribe(() => this.emitDraft());
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.pendingFile = file;
    this.revokePreview();
    if (file) {
      this.previewUrl.set(URL.createObjectURL(file));
      if (!this.form.controls.alt_text.value) {
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        this.form.patchValue({ alt_text: name });
      }
    }
    this.emitDraft();
  }

  private emitDraft(): void {
    this.draftChange.emit({
      file: this.pendingFile,
      alt_text: this.form.controls.alt_text.value,
      is_primary: this.form.controls.is_primary.value,
    });
  }

  reset(): void {
    this.pendingFile = null;
    this.revokePreview();
    this.form.reset({ alt_text: '', is_primary: true });
    this.emitDraft();
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    this.previewUrl.set(null);
  }
}
