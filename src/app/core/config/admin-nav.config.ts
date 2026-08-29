export interface AdminNavItem {
  label: string;
  path: string;
  exact?: boolean;
  permissions?: string[];
}

export const ECOMMERCE_NAV: AdminNavItem[] = [
  { label: 'Catálogo', path: '/ecommerce', exact: true },
  { label: 'Mis reservas', path: '/ecommerce/cuenta/reservas' },
  { label: 'Mis compras', path: '/ecommerce/cuenta/pedidos' },
  { label: 'Asistente IA', path: '/ecommerce/asistente' },
];

/** Menú del backoffice — visible según permisos RBAC del usuario */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Panel', path: '/admin', exact: true },
  { label: 'Roles', path: '/admin/roles', permissions: ['rbac.roles.view'] },
  { label: 'Permisos', path: '/admin/permisos', permissions: ['rbac.permissions.view'] },
  { label: 'Usuarios', path: '/admin/usuarios', permissions: ['accounts.users.view'] },
  { label: 'Sucursales', path: '/admin/sucursales', permissions: ['branches.view'] },
  { label: 'Productos', path: '/admin/productos', permissions: ['catalog.products.view'] },
  { label: 'Categorías', path: '/admin/categorias', permissions: ['catalog.products.view'] },
  { label: 'Tallas y colores', path: '/admin/atributos', permissions: ['catalog.products.view'] },
  { label: 'Temporadas', path: '/admin/temporadas', permissions: ['catalog.products.view'] },
  { label: 'Colecciones', path: '/admin/colecciones', permissions: ['catalog.products.view'] },
  { label: 'Proveedores', path: '/admin/proveedores', permissions: ['suppliers.view'] },
  { label: 'Inventario', path: '/admin/inventario', permissions: ['inventory.stock.view'] },
  { label: 'Reservas', path: '/admin/reservas', permissions: ['reservations.view'] },
  { label: 'Órdenes', path: '/admin/ordenes', permissions: ['orders.view'] },
  { label: 'Punto de venta', path: '/admin/pos', permissions: ['pos.sales'] },
  { label: 'Reportes', path: '/admin/reportes', permissions: ['reports.view'] },
];

export const ADMIN_SHELL = {
  label: 'Administración',
  accent: '#1e3a5f',
};

export const ECOMMERCE_SHELL = {
  label: 'FashionStore',
  accent: '#b45309',
};
