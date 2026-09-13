import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS
} from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalBroadcastService,
  MsalGuard,
  MsalInterceptor,
  MsalService
} from '@azure/msal-angular';
import {
  BrowserCacheLocation,
  InteractionType,
  LogLevel,
  PublicClientApplication
} from '@azure/msal-browser';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

/**
 * Crea la instancia de PublicClientApplication con la configuración de Azure AD.
 * Se usa en el proveedor MSAL_INSTANCE.
 */
export function MSALInstanceFactory() {
  return new PublicClientApplication({
    auth: environment.msalConfig.auth,
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
      storeAuthStateInCookie: false
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false
      }
    }
  });
}

/**
 * Configura el MsalInterceptor para que adjunte automáticamente el Bearer token
 * a todas las llamadas al BFF (environment.apiConfig.uri).
 * Los scopes definen qué permisos se solicitan al token.
 */
export function MSALInterceptorConfigFactory() {
  const protectedResourceMap = new Map<string, Array<string>>();
  protectedResourceMap.set(environment.apiConfig.uri, environment.apiConfig.scopes);
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),

    // withInterceptorsFromDi() es obligatorio para que HTTP_INTERCEPTORS
    // basados en clases (como MsalInterceptor) funcionen en Angular 17+.
    // Sin esto, el interceptor se registra pero nunca se ejecuta.
    provideHttpClient(withInterceptorsFromDi()),

    // MsalInterceptor adjunta el Bearer token a cada request hacia el BFF.
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },

    // Instancia principal de MSAL con configuración de Azure AD.
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },

    // Guard: redirige a login si el usuario no está autenticado.
    {
      provide: MSAL_GUARD_CONFIG,
      useValue: {
        interactionType: InteractionType.Redirect,
        authRequest: {
          scopes: environment.apiConfig.scopes
        }
      }
    },

    // Interceptor: mapa de recursos protegidos → scopes requeridos.
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },

    // Inicializa MSAL antes de que la app arranque (maneja redirects de Azure AD).
    {
      provide: APP_INITIALIZER,
      useFactory: (msalService: MsalService) => () => msalService.initialize(),
      deps: [MsalService],
      multi: true
    },

    MsalService,
    MsalGuard,
    MsalBroadcastService
  ]
};
