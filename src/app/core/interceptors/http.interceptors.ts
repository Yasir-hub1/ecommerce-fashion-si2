import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, from, Observable, shareReplay, switchMap, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../services/notification.service';
import type { ApiErrorBody } from '../models/api.models';

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_STOCK: 'No hay stock suficiente en la sucursal seleccionada.',
  RESERVATION_EXPIRED: 'Tu reserva ha expirado. Crea una nueva reserva.',
  INVALID_STATUS_TRANSITION: 'No se puede cambiar el estado de la reserva.',
  ORDER_NOT_PAYABLE: 'Esta orden ya no puede pagarse.',
  PAYMENT_FAILED: 'El pago no pudo procesarse. Intenta de nuevo.',
  BRANCH_CLOSED_AT_TIME: 'La sucursal está cerrada en ese horario.',
  FITTING_SLOT_FULL: 'No hay cupo en el probador para esa hora.',
};

let refreshInFlight: Observable<string | null> | null = null;

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.url.includes('/auth/refresh/')) {
        return throwError(() => error);
      }

      if (!refreshInFlight) {
        refreshInFlight = from(auth.refreshAccessToken()).pipe(shareReplay(1));
      }

      return refreshInFlight.pipe(
        switchMap((newToken) => {
          refreshInFlight = null;
          if (!newToken) return throwError(() => error);
          return next(
            req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }),
          );
        }),
        catchError((refreshError) => {
          refreshInFlight = null;
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.url.includes('/auth/login')) {
        return throwError(() => error);
      }

      const body = error.error as ApiErrorBody | undefined;
      const code = body?.error?.code ?? body?.code;
      const message =
        (code && ERROR_MESSAGES[code]) ||
        body?.error?.message ||
        body?.message ||
        body?.detail ||
        'Ocurrió un error inesperado.';

      if (error.status !== 401) {
        notifications.error(message);
      }

      return throwError(() => error);
    }),
  );
};
