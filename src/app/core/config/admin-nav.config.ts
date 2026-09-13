export interface AdminNavItem {
  label: string;
  path: string;
  exact?: boolean;
  permissions?: string[];
  roles?: string[];
  /** Sección visual del sidebar (solo UI). */
  group?: string;
}

export const ECOMMERCE_NAV: AdminNavItem[] = [
  { label: 'Explorar', path: '/ecommerce', exact: true },
  { label: 'Probador', path: '/ecommerce/reserva' },
  { label: 'Reservas', path: '/ecommerce/cuenta/reservas' },
  { label: 'Pedidos', path: '/ecommerce/cuenta/pedidos' },
  { label: 'Estilista', path: '/ecommerce/asistente' },
];

/** Menú del backoffice — visible según permisos RBAC del usuario */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Panel', path: '/admin', exact: true, group: 'Vista' },
  { label: 'Roles', path: '/admin/roles', permissions: ['rbac.roles.view'], group: 'Personas' },
  { label: 'Permisos', path: '/admin/permisos', permissions: ['rbac.permissions.view'], group: 'Personas' },
  { label: 'Usuarios', path: '/admin/usuarios', permissions: ['accounts.users.view'], group: 'Personas' },
  { label: 'Sucursales', path: '/admin/sucursales', permissions: ['branches.view'], group: 'Red' },
  { label: 'Productos', path: '/admin/productos', permissions: ['catalog.products.view'], group: 'Catálogo' },
  { label: 'Marcas', path: '/admin/marcas', permissions: ['catalog.products.view'], group: 'Catálogo' },
  { label: 'Categorías', path: '/admin/categorias', permissions: ['catalog.products.view'], group: 'Catálogo' },
  { label: 'Tallas y colores', path: '/admin/atributos', permissions: ['catalog.products.view'], group: 'Catálogo' },
  { label: 'Temporadas', path: '/admin/temporadas', permissions: ['catalog.products.view'], group: 'Catálogo' },
  { label: 'Colecciones', path: '/admin/colecciones', permissions: ['catalog.products.view'], group: 'Catálogo' },
  { label: 'Promociones', path: '/admin/promociones', permissions: ['promotions.view'], group: 'Catálogo' },
  { label: 'Proveedores', path: '/admin/proveedores', permissions: ['suppliers.view'], group: 'Red' },
  { label: 'Portal proveedor', path: '/admin/portal-proveedor', roles: ['SUPPLIER'], group: 'Red' },
  { label: 'Inventario', path: '/admin/inventario', permissions: ['inventory.stock.view'], group: 'Flujo' },
  { label: 'Reservas', path: '/admin/reservas', permissions: ['reservations.view'], group: 'Flujo' },
  {
    label: 'Reservas del día',
    path: '/admin/reservas/dia',
    permissions: ['reservations.view'],
    roles: ['BRANCH_MANAGER', 'CASHIER'],
    group: 'Flujo',
  },
  { label: 'Órdenes', path: '/admin/ordenes', permissions: ['orders.view'], group: 'Flujo' },
  { label: 'Punto de venta', path: '/admin/pos', permissions: ['pos.sales'], group: 'Flujo' },
  { label: 'Reportes', path: '/admin/reportes', permissions: ['reports.view'], group: 'Flujo' },
];

export const ADMIN_SHELL = {
  label: 'Operaciones',
  accent: '#07111c',
};

export const ECOMMERCE_SHELL = {
  label: 'VETA',
  accent: '#ff2d1a',
};

/** Orden de secciones en el sidebar. */
export const ADMIN_NAV_GROUP_ORDER = ['Vista', 'Flujo', 'Catálogo', 'Red', 'Personas'] as const;
