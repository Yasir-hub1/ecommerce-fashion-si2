/** Shared styles for admin CRUD pages (tables, modals, headers) */
export const ADMIN_CRUD_STYLES = `
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .page-title { font-family: var(--font-display); margin: 0; }
  .subtitle { color: var(--color-muted); margin: 0.25rem 0 0; font-size: 0.875rem; }
  .tabs { display: flex; gap: 0.375rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .tab {
    padding: 0.45rem 0.875rem; border-radius: 999px; border: 1px solid var(--color-border);
    background: var(--color-surface); cursor: pointer; font-size: 0.8125rem;
  }
  .tab.active { background: var(--color-accent); color: white; border-color: var(--color-accent); }
  .table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: 0.875rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--color-border); vertical-align: top; }
  th { background: var(--color-surface-2); font-weight: 600; }
  .actions { display: flex; gap: 0.375rem; flex-wrap: wrap; }
  .danger { color: #b91c1c; }
  .badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 999px; background: var(--color-surface-2); }
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: grid; place-items: center; z-index: 100; padding: 1rem;
  }
  .modal {
    width: min(560px, 100%); max-height: 90dvh; overflow: auto;
    background: var(--color-surface); border-radius: 1rem; padding: 1.25rem;
    border: 1px solid var(--color-border);
  }
  .modal.wide { width: min(720px, 100%); }
  .modal h2 { margin: 0 0 1rem; font-family: var(--font-display); font-size: 1.125rem; }
  form { display: grid; gap: 0.875rem; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
  label.inline { display: flex; align-items: center; gap: 0.5rem; font-weight: 400; }
  input, select, textarea {
    border: 1px solid var(--color-border); border-radius: 0.625rem;
    padding: 0.625rem 0.75rem; font: inherit; background: var(--color-bg);
  }
  .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.25rem; }
  @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
`;
