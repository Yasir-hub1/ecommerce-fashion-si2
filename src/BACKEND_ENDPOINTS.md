# Endpoints pendientes en backend (FashionStore)

Documento generado desde el frontend Angular (`frontend/src`). Lista APIs que el front ya consume o necesita para completar funcionalidades del examen SI2.

**Base:** `/api/v1/`

---

## Autenticación y cuenta

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/password-reset/` | Solicitar recuperación de contraseña por email. Body: `{ "email" }`. Respuesta genérica aunque el email no exista. |
| POST | `/auth/password-reset/confirm/` | Confirmar nueva contraseña con token del email. Body: `{ "token", "password", "password_confirm" }`. |
| PATCH | `/users/me/` | *(Opcional)* Actualizar perfil propio sin usar `PATCH /users/{id}/`. Hoy el front usa `PATCH /users/{id}/` del usuario logueado. |

---

## Catálogo y POS

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/variants/lookup/?barcode=` | Resolver variante activa por código de barras (POS). Respuesta tipo `ProductVariantDetail` + `product_id`. |
| GET | `/variants/?barcode=` | Alternativa: filtro exacto en listado de variantes. |
| GET | `/products/?size=&color=` | Filtrar productos del catálogo por talla/color de variante (filtros ecommerce aún no soportados en listado). |
| POST | `/products/{id}/variants/generate/` | Generar variantes masivas talla × color. Body: `{ "size_ids": [], "color_ids": [], "skip_existing": true }`. |

---

## Comprobantes y pedidos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/orders/{id}/receipt/` | Metadatos del comprobante: `{ "receipt_number", "pdf_url", "order_code" }`. |
| GET | `/orders/{id}/receipt/pdf/` | Descarga/stream del PDF (autenticado, dueño o staff). Usado tras checkout web y venta POS. |
| GET | `/orders/?branch=&channel=&created_at__date=` | Filtros para ventas del día por sucursal/caja (encargado/cajero). |

---

## IA y recomendaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/ai/chat/` | Chat asistente de moda. Body: `{ "messages": [{ "role", "content" }], "branch_id"?: number }`. Respuesta: `{ "reply", "suggestions"?: [] }`. |
| GET | `/ai/recommendations/` | Recomendaciones personalizadas. Query: `branch_id`, `limit`. Respuesta: `{ "products": [], "reason": string }`. |

> **Nota:** En `config/urls.py` la ruta `ai/` está comentada. Habilitar app + URLs.

---

## Reportes e indicadores

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/reports/summary/` | KPIs: ventas, órdenes, reservas, conversión, stock bajo, top productos. Query: `branch_id`, `from`, `to`. |
| GET | `/reports/` | Historial de reportes generados. |
| POST | `/reports/generate/` | Reporte generativo (texto o voz). Body: `{ "prompt", "report_type"?, "branch_id"? }`. |
| GET | `/reports/export/{type}/` | Exportación CSV/Excel. Tipos: `sales`, `inventory`, `reservations`. Query: filtros de fecha/sucursal. |

> **Nota:** En `config/urls.py` la ruta `reports/` está comentada.

---

## Portal proveedor

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/supplier/product-submissions/` | Propuesta de producto por proveedor. Body: nombre, descripción, `collection_id`, género, precio, material. Estado `PENDING` hasta revisión admin. |
| GET | `/supplier/product-submissions/` | Listar envíos del proveedor logueado. |
| GET | `/products/?supplier=` | *(Opcional)* Productos asociados al proveedor vía colección, sin iterar colecciones en el front. |

---

## Reservas (mejoras)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/reservations/?search=` | Búsqueda por código RSV (POS carga reserva por código). |
| GET | `/reservations/today/` | *(Opcional)* Alias de reservas del día por sucursal del staff (hoy `upcoming/` cubre parte del flujo). |

---

## Promociones en checkout

| Método | Ruta | Descripción |
|--------|------|-------------|
| — | `/cart/checkout/` | Confirmar que acepta `promotion_code` en body (documentado en admin-crud-api). El front ya lo envía si se implementa cupón en carrito. |

---

## Prioridad sugerida

1. **Comprobantes PDF** (`/orders/{id}/receipt/`) — cliente e POS  
2. **IA** (`/ai/chat/`, `/ai/recommendations/`) — ecommerce  
3. **Reportes** (`/reports/*`) — admin / encargado  
4. **Password reset** — auth público  
5. **Variant lookup barcode** — POS  
6. **Supplier submissions** — portal proveedor  
7. **Bulk variant generate** — admin catálogo  

---

## Endpoints ya disponibles (referencia)

El front usa entre otros: `/auth/login/`, `/auth/register/`, `/users/`, `/employees/create/`, `/roles/`, `/permissions/`, `/branches/`, `/products/`, `/variants/`, `/reservations/`, `/cart/`, `/orders/`, `/pos/sales/`, `/promotions/`, `/ar-assets/`, `/stock/`, `/purchase-receipts/`, `/checkout-session/`.
