import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { proveerAutenticacion } from './core/auth/auth.provider';
import { devAuthInterceptor } from './core/interceptors/auth.interceptor';

/**
 * `withInterceptorsFromDi` es necesario para `MsalInterceptor`, que es class-based y se
 * registra por `HTTP_INTERCEPTORS`. `withInterceptors` registra el interceptor funcional del
 * modo desarrollo. Conviven sin conflicto: cada uno se desactiva solo en el modo que no le
 * corresponde.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi(), withInterceptors([devAuthInterceptor])),
    ...proveerAutenticacion(),
  ],
};
