import { Routes } from '@angular/router';

import { RoleRedirectComponent } from './core/auth/role-redirect.component';
import {
  authGuard,
  ecommerceCustomerGuard,
  guestGuard,
  permissionGuard,
  staffGuard,
} from './core/auth/auth.guards';
import { AdminShellComponent } from './layout/admin-shell/admin-shell.component';
import { EcommerceShellComponent } from './layout/ecommerce-shell/ecommerce-shell.component';

export const routes: Routes = [
  { path: 'inicio', component: RoleRedirectComponent, canActivate: [authGuard] },

  {
    path: 'ecommerce',
    component: EcommerceShellComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/catalog/pages/product-list/product-list-page.component').then(
            (m) => m.ProductListPageComponent,
          ),
      },
      {
        path: 'producto/:id',
        loadComponent: () =>
          import('./features/catalog/pages/product-detail/product-detail-page.component').then(
            (m) => m.ProductDetailPageComponent,
          ),
      },
      {
        path: 'carrito',
        canActivate: [authGuard, ecommerceCustomerGuard],
        loadComponent: () =>
          import('./features/cart/pages/cart-page/cart-page.component').then(
            (m) => m.CartPageComponent,
          ),
      },
      {
        path: 'checkout/:orderId',
        canActivate: [authGuard, ecommerceCustomerGuard],
        loadComponent: () =>
          import('./features/checkout/pages/checkout-page/checkout-page.component').then(
            (m) => m.CheckoutPageComponent,
          ),
      },
      {
        path: 'checkout/resultado',
        canActivate: [authGuard, ecommerceCustomerGuard],
        loadComponent: () =>
          import('./features/checkout/pages/checkout-result/checkout-result-page.component').then(
            (m) => m.CheckoutResultPageComponent,
          ),
      },
      {
        path: 'cuenta',
        canActivate: [authGuard, ecommerceCustomerGuard],
        loadComponent: () =>
          import('./features/account/pages/profile/profile-page.component').then(
            (m) => m.ProfilePageComponent,
          ),
      },
      {
        path: 'cuenta/pedidos',
        canActivate: [authGuard, ecommerceCustomerGuard],
        loadComponent: () =>
          import('./features/account/pages/orders/orders-page.component').then(
            (m) => m.OrdersPageComponent,
          ),
      },
      {
        path: 'cuenta/reservas',
        canActivate: [authGuard, ecommerceCustomerGuard],
        loadComponent: () =>
          import('./features/account/pages/reservations/reservations-page.component').then(
            (m) => m.ReservationsPageComponent,
          ),
      },
      {
        path: 'asistente',
        loadComponent: () =>
          import('./features/assistant/pages/chat/assistant-page.component').then(
            (m) => m.AssistantPageComponent,
          ),
      },
    ],
  },

  {
    path: 'admin',
    component: AdminShellComponent,
    canActivate: [staffGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/pages/dashboard/admin-dashboard-page.component').then(
            (m) => m.AdminDashboardPageComponent,
          ),
      },
      {
        path: 'roles',
        canActivate: [permissionGuard('rbac.roles.view')],
        loadComponent: () =>
          import('./features/admin/pages/roles/admin-roles-page.component').then(
            (m) => m.AdminRolesPageComponent,
          ),
      },
      {
        path: 'permisos',
        canActivate: [permissionGuard('rbac.permissions.view')],
        loadComponent: () =>
          import('./features/admin/pages/permissions/admin-permissions-page.component').then(
            (m) => m.AdminPermissionsPageComponent,
          ),
      },
      {
        path: 'usuarios',
        canActivate: [permissionGuard('accounts.users.view')],
        loadComponent: () =>
          import('./features/admin/pages/users/admin-users-page.component').then(
            (m) => m.AdminUsersPageComponent,
          ),
      },
      {
        path: 'sucursales',
        canActivate: [permissionGuard('branches.view')],
        loadComponent: () =>
          import('./features/admin/pages/branches/admin-branches-page.component').then(
            (m) => m.AdminBranchesPageComponent,
          ),
      },
      {
        path: 'productos/:id',
        canActivate: [permissionGuard('catalog.products.view')],
        loadComponent: () =>
          import('./features/admin/pages/products/admin-product-detail-page.component').then(
            (m) => m.AdminProductDetailPageComponent,
          ),
      },
      {
        path: 'productos',
        canActivate: [permissionGuard('catalog.products.view')],
        loadComponent: () =>
          import('./features/admin/pages/products/admin-products-page.component').then(
            (m) => m.AdminProductsPageComponent,
          ),
      },
      {
        path: 'categorias',
        canActivate: [permissionGuard('catalog.products.view')],
        loadComponent: () =>
          import('./features/admin/pages/categories/admin-categories-page.component').then(
            (m) => m.AdminCategoriesPageComponent,
          ),
      },
      {
        path: 'atributos',
        canActivate: [permissionGuard('catalog.products.view')],
        loadComponent: () =>
          import('./features/admin/pages/attributes/admin-attributes-page.component').then(
            (m) => m.AdminAttributesPageComponent,
          ),
      },
      {
        path: 'temporadas',
        canActivate: [permissionGuard('catalog.products.view')],
        loadComponent: () =>
          import('./features/admin/pages/seasons/admin-seasons-page.component').then(
            (m) => m.AdminSeasonsPageComponent,
          ),
      },
      {
        path: 'colecciones',
        canActivate: [permissionGuard('catalog.products.view')],
        loadComponent: () =>
          import('./features/admin/pages/collections/admin-collections-page.component').then(
            (m) => m.AdminCollectionsPageComponent,
          ),
      },
      {
        path: 'proveedores',
        canActivate: [permissionGuard('suppliers.view')],
        loadComponent: () =>
          import('./features/admin/pages/suppliers/admin-suppliers-page.component').then(
            (m) => m.AdminSuppliersPageComponent,
          ),
      },
      {
        path: 'inventario',
        canActivate: [permissionGuard('inventory.stock.view')],
        loadComponent: () =>
          import('./features/admin/pages/inventory/admin-inventory-page.component').then(
            (m) => m.AdminInventoryPageComponent,
          ),
      },
      {
        path: 'reservas',
        canActivate: [permissionGuard('reservations.view')],
        loadComponent: () =>
          import('./features/admin/pages/reservations/admin-reservations-page.component').then(
            (m) => m.AdminReservationsPageComponent,
          ),
      },
      {
        path: 'ordenes',
        canActivate: [permissionGuard('orders.view')],
        loadComponent: () =>
          import('./features/admin/pages/orders/admin-orders-page.component').then(
            (m) => m.AdminOrdersPageComponent,
          ),
      },
      {
        path: 'pos',
        canActivate: [permissionGuard('pos.sales')],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/pos/pages/pos-sale/pos-sale-page.component').then(
                (m) => m.PosSalePageComponent,
              ),
          },
          {
            path: 'ventas',
            loadComponent: () =>
              import('./features/pos/pages/sales-today/pos-sales-today-page.component').then(
                (m) => m.PosSalesTodayPageComponent,
              ),
          },
          {
            path: 'buscar',
            loadComponent: () =>
              import('./features/pos/pages/product-search/pos-product-search-page.component').then(
                (m) => m.PosProductSearchPageComponent,
              ),
          },
        ],
      },
      {
        path: 'reportes',
        canActivate: [permissionGuard('reports.view')],
        loadComponent: () =>
          import('./features/admin/pages/reports/admin-reports-page.component').then(
            (m) => m.AdminReportsPageComponent,
          ),
      },
    ],
  },

  {
    path: 'auth',
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/login-page.component').then(
            (m) => m.LoginPageComponent,
          ),
      },
      {
        path: 'registro',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/register/register-page.component').then(
            (m) => m.RegisterPageComponent,
          ),
      },
    ],
  },

  { path: '', redirectTo: 'ecommerce', pathMatch: 'full' },
  { path: 'tienda', redirectTo: 'ecommerce', pathMatch: 'prefix' },
  { path: 'sucursal', redirectTo: 'admin', pathMatch: 'prefix' },
  { path: 'caja', redirectTo: 'admin/pos', pathMatch: 'prefix' },
  { path: 'proveedor', redirectTo: 'admin', pathMatch: 'prefix' },
  { path: 'producto/:id', redirectTo: 'ecommerce/producto/:id' },
  { path: 'carrito', redirectTo: 'ecommerce/carrito' },
  { path: 'checkout/:orderId', redirectTo: 'ecommerce/checkout/:orderId' },
  { path: 'checkout/resultado', redirectTo: 'ecommerce/checkout/resultado' },
  { path: 'cuenta', redirectTo: 'ecommerce/cuenta' },
  { path: 'cuenta/:rest', redirectTo: 'ecommerce/cuenta/:rest' },

  { path: '**', redirectTo: 'ecommerce' },
];
