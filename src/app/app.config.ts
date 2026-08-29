import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { errorInterceptor, jwtInterceptor } from './core/interceptors/http.interceptors';
import { AuthService } from './core/auth/auth.service';
import { BranchContextService } from './core/services/branch-context.service';
import { CartStore } from './core/services/cart.store';

function appInitializer(
  auth: AuthService,
  branches: BranchContextService,
  cart: CartStore,
): () => Promise<void> {
  return async () => {
    await auth.init();
    await branches.init();
    await cart.refresh();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([jwtInterceptor, errorInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      deps: [AuthService, BranchContextService, CartStore],
      multi: true,
    },
  ],
};
