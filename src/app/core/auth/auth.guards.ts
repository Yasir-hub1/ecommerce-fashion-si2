import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { getPostLoginPath } from '../services/permission.service';
import { PermissionService } from '../services/permission.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: router.url },
  });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree([getPostLoginPath(auth.user()?.role ?? 'CUSTOMER')]);
};

/** Solo clientes acceden al carrito, checkout y cuenta en ecommerce */
export const ecommerceCustomerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: router.url },
    });
  }
  if (auth.user()?.role === 'CUSTOMER') return true;
  return router.createUrlTree(['/admin']);
};

/** Backoffice: cualquier rol distinto de CUSTOMER */
export const staffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: router.url },
    });
  }
  if (auth.user()?.role !== 'CUSTOMER') return true;
  return router.createUrlTree(['/ecommerce']);
};

export function permissionGuard(...codes: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const perms = inject(PermissionService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: router.url },
      });
    }
    if (auth.user()?.role === 'CUSTOMER') {
      return router.createUrlTree(['/ecommerce']);
    }
    if (auth.user()?.role === 'ADMIN') return true;
    if (perms.hasAny(...codes)) return true;
    return router.createUrlTree(['/admin']);
  };
}
