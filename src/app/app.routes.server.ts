import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Esta app depende del API Django (`/api/v1`).
 * No usar Prerender/Server en rutas que llaman al API en el constructor/ngOnInit:
 * en build-time no hay backend detrás de `/api/v1` y el prerender falla con
 * "Unable to handle request: '/api/v1/...'".
 *
 * Client = CSR (recomendado con API externo + proxy Nginx en producción).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '**', renderMode: RenderMode.Client },
];
