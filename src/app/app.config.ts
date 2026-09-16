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
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { getRuntimeConfig } from './core/runtime-config';
import { saveAuthError } from './services/auth-error';

/**
 * Crea la instancia de PublicClientApplication con la configuración de Azure AD.
 * Se usa en el proveedor MSAL_INSTANCE.
 */
export function MSALInstanceFactory() {
  const config = getRuntimeConfig();

  return new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: config.authority,
      redirectUri: config.redirectUri,
      postLogoutRedirectUri: config.postLogoutRedirectUri
    },
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
 * a todas las llamadas al API Gateway (RuntimeConfig.apiUri).
 * Los scopes definen qué permisos se solicitan al token.
 */
export function MSALInterceptorConfigFactory() {
  const config = getRuntimeConfig();

  const protectedResourceMap = new Map<string, Array<string>>();
  // Solo el origen del API Gateway con las rutas protegidas. Si apuntara al
  // origen desde el que se sirve la SPA, el interceptor adjuntaría el Bearer a
  // la descarga de los propios estáticos.
  // Una clave vacía en el mapa haría coincidir cualquier URL y MSAL intentaría
  // adjuntar un Bearer hasta a la descarga de los estáticos.
  if (config.apiUri) {
    protectedResourceMap.set(config.apiUri, config.scopes);
  } else {
    console.warn('[MSAL] apiUri sin definir: el interceptor no adjuntará el token a ninguna llamada');
  }
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

/**
 * Se ejecuta antes del primer ruteo:
 *  1. Inicializa MSAL.
 *  2. Procesa la respuesta de Azure AD si la página vuelve de un loginRedirect /
 *     acquireTokenRedirect (el código viene en el fragmento de la URL y se perdería
 *     si el router navega antes).
 *  3. Deja una cuenta activa para guards, interceptor y componentes.
 *
 * MsalBroadcastService se inyecta para que ya esté escuchando los eventos y
 * inProgress$ pase a InteractionStatus.None al terminar (lo esperan los guards
 * y el MsalInterceptor al renovar tokens).
 */
export function MSALInitializerFactory(msalService: MsalService, _broadcast: MsalBroadcastService) {
  return () => firstValueFrom(msalService.handleRedirectObservable())
    .then(result => {
      const instance = msalService.instance;
      if (result?.account) {
        instance.setActiveAccount(result.account);
      } else if (!instance.getActiveAccount() && instance.getAllAccounts().length > 0) {
        instance.setActiveAccount(instance.getAllAccounts()[0]);
      }
    })
    .catch(err => {
      console.error('MSAL: error al procesar la respuesta de Azure AD', err);
      // Se guarda para que /login explique el error en vez de volver sin aviso.
      saveAuthError(err);
    });
}

/**
 * Configuración de MsalGuard. Las rutas usan AuthGuard y RoleGuard, que esperan
 * a MSAL y respetan la pantalla /login; estos scopes solo se aplican si el guard
 * llega a iniciar la interacción.
 */
export function MSALGuardConfigFactory() {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: { scopes: getRuntimeConfig().scopes },
    loginFailedRoute: '/login'
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

    // Configuración de MsalGuard (scopes a pedir si inicia la interacción).
    // Las rutas usan AuthGuard/RoleGuard, que esperan a MSAL y respetan la pantalla /login.
    {
      provide: MSAL_GUARD_CONFIG,
      // useFactory y no useValue: un useValue se evalúa al importar este módulo,
      // es decir antes de que loadRuntimeConfig() haya resuelto los scopes.
      useFactory: MSALGuardConfigFactory
    },

    // Interceptor: mapa de recursos protegidos → scopes requeridos.
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },

    // Inicializa MSAL y procesa el redirect de Azure AD antes de que la app arranque.
    {
      provide: APP_INITIALIZER,
      useFactory: MSALInitializerFactory,
      deps: [MsalService, MsalBroadcastService],
      multi: true
    },

    MsalService,
    MsalGuard,
    MsalBroadcastService
  ]
};
