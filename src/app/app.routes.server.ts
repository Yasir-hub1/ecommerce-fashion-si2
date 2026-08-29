import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'ecommerce', renderMode: RenderMode.Prerender },
  { path: 'ecommerce/producto/:id', renderMode: RenderMode.Server },
  { path: 'ecommerce/checkout/:orderId', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Client },
];
