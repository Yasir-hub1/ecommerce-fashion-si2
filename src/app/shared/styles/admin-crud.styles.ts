/** Shared styles for admin CRUD pages (tables, modals, headers) — mobile-first */
export const ADMIN_CRUD_STYLES = `
  .page-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;
  }
  .page-title { font-family: var(--font-display); margin: 0; font-size: clamp(1.25rem, 4vw, 1.75rem); }
  .subtitle { color: var(--color-muted); margin: 0.25rem 0 0; font-size: 0.875rem; }
  .tabs {
    display: flex; gap: 0.375rem; margin-bottom: 1rem; flex-wrap: nowrap;
    overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 0.15rem;
    scrollbar-width: thin;
  }
  .tab {
    padding: 0.5rem 0.875rem; border-radius: 999px; border: 1px solid var(--color-border);
    background: var(--color-surface); cursor: pointer; font-size: 0.8125rem;
    white-space: nowrap; flex-shrink: 0; min-height: 2.5rem;
  }
  .tab.active { background: var(--color-accent); color: white; border-color: var(--color-accent); }
  .table-wrap {
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    border: 1px solid var(--color-border); border-radius: 0.875rem;
    max-width: 100%;
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; min-width: 32rem; }
  th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--color-border); vertical-align: top; }
  th { background: var(--color-surface-2); font-weight: 600; white-space: nowrap; }
  .actions { display: flex; gap: 0.375rem; flex-wrap: wrap; }
  .danger { color: #b91c1c; }
  .badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 999px; background: var(--color-surface-2); }
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: grid; place-items: end center; z-index: 100; padding: 0;
  }
  .modal {
    width: 100%; max-height: 92dvh; overflow: auto;
    background: var(--color-surface);
    border-radius: 1rem 1rem 0 0; padding: 1.25rem;
    border: 1px solid var(--color-border);
  }
  .modal.wide { width: 100%; }
  .modal h2 { margin: 0 0 1rem; font-family: var(--font-display); font-size: 1.125rem; }
  form { display: grid; gap: 0.875rem; }
  .form-row { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
  label { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
  label.inline { display: flex; align-items: center; gap: 0.5rem; font-weight: 400; }
  input, select, textarea {
    border: 1px solid var(--color-border); border-radius: 0.625rem;
    padding: 0.625rem 0.75rem; font: inherit; background: var(--color-bg);
    width: 100%; min-height: 2.75rem;
  }
  textarea { min-height: 5rem; }
  .modal-actions {
    display: flex; justify-content: stretch; gap: 0.5rem; margin-top: 0.25rem; flex-wrap: wrap;
  }
  .modal-actions .btn { flex: 1 1 auto; }

  @media (min-width: 640px) {
    .form-row { grid-template-columns: 1fr 1fr; }
    .modal-backdrop { place-items: center; padding: 1rem; }
    .modal {
      width: min(560px, 100%); border-radius: 1rem; max-height: 90dvh;
    }
    .modal.wide { width: min(720px, 100%); }
    .modal-actions { justify-content: flex-end; }
    .modal-actions .btn { flex: 0 0 auto; }
  }

  @media (max-width: 480px) {
    th, td { padding: 0.625rem 0.75rem; }
    table { font-size: 0.8125rem; min-width: 28rem; }
  }
`;

/** Shared responsive list-row layouts (orders, reservations, inventory cards) */
export const LIST_ROW_STYLES = `
  .page-title { font-family: var(--font-display); margin: 0 0 1rem; font-size: clamp(1.25rem, 4vw, 1.75rem); }
  .subtitle, .hint { color: var(--color-muted); margin: 0.25rem 0 1rem; font-size: 0.875rem; }
  .row {
    display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start;
    padding: 0.875rem 1rem; border: 1px solid var(--color-border); border-radius: 0.625rem;
    background: var(--color-surface); margin-bottom: 0.5rem; flex-wrap: wrap;
    text-decoration: none; color: inherit;
  }
  .row p, .meta, .expire { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--color-muted); }
  .time { font-weight: 600; color: var(--color-text); }
  .expire { color: #b45309; }
  .right { text-align: right; display: grid; gap: 0.35rem; margin-left: auto; justify-items: end; }
  .status { font-size: 0.75rem; color: var(--color-muted); }
  .price, .stock { font-weight: 700; }
  .badge {
    font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 999px;
    background: var(--color-surface-2); justify-self: end;
  }
  .actions { display: flex; gap: 0.375rem; flex-wrap: wrap; justify-content: flex-end; }
  a { color: var(--color-accent); text-decoration: none; font-weight: 600; }

  @media (max-width: 540px) {
    .row { flex-direction: column; align-items: stretch; }
    .right {
      text-align: left; margin-left: 0; justify-items: start; width: 100%;
      padding-top: 0.35rem; border-top: 1px solid var(--color-border);
    }
    .badge { justify-self: start; }
    .actions { justify-content: stretch; width: 100%; }
    .actions .btn { flex: 1 1 auto; }
  }
`;
