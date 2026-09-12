import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  EnvironmentProviders,
  Provider,
  inject,
  provideAppInitializer,
} from '@angular/core';
import {
  BrowserCacheLocation,
  IPublicClientApplication,
  InteractionType,
  LogLevel,
  PublicClientApplication,
} from '@azure/msal-browser';
import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalBroadcastService,
  MsalGuard,
  MsalGuardConfiguration,
  MsalInterceptor,
  MsalInterceptorConfiguration,
  MsalService,
  ProtectedResourceScopes,
} from '@azure/msal-angular';

import { environment } from '../../../environments/environment';
import { TenantKey } from '../../../environments/environment.model';

const CLAVE_TENANT = 'andesstay.tenant';

/**
 * Tenant elegido en la pantalla de login.
 *
 * `MSAL_INSTANCE` se resuelve una sola vez al arrancar la aplicacion, asi que la eleccion
 * tiene que estar disponible antes de que exista la inyeccion de dependencias. Por eso se
 * guarda en sessionStorage y se lee directo aqui, sin pasar por un servicio.
 *
 * Cambiar de tenant implica recargar la pagina, que es lo que hace la pantalla de login: no
 * es una limitacion a ocultar, es consecuencia de que MSAL asocia una instancia a una sola
 * authority y AndesStay tiene dos tenants.
 */
export function tenantSeleccionado(): TenantKey {
  const guardado = sessionStorage.getItem(CLAVE_TENANT);
  return guardado === 'guest' ? 'guest' : 'staff';
}

export function seleccionarTenant(tenant: TenantKey): void {
  sessionStorage.setItem(CLAVE_TENANT, tenant);
}

/**
 * Indica si un tenant tiene sus identificadores reales cargados.
 *
 * Los environments se versionan con marcadores `<...>` en los valores que faltan. Detectarlos
 * permite dar un mensaje claro en vez de dejar que MSAL falle con un error de authority.
 */
export function tenantConfigurado(tenant: TenantKey): boolean {
  const c = environment.tenants[tenant];
  const valores = [c.clientId, c.authority, c.scope, ...c.knownAuthorities];
  return valores.every((v) => v.length > 0 && !v.includes('<'));
}

/** Scope propio del tenant activo. Nunca un scope de Microsoft Graph: ver nota abajo. */
export function scopeActivo(): string {
  return environment.tenants[tenantSeleccionado()].scope;
}

/**
 * Construye la instancia de MSAL para el tenant activo.
 *
 * La plataforma del App Registration es Single-page application, lo que obliga a
 * Authorization Code con PKCE y deshabilita el flujo implicito. MSAL genera el
 * `code_verifier` y el `code_challenge` por su cuenta.
 */
export function MSALInstanceFactory(): IPublicClientApplication {
  const tenant = tenantSeleccionado();
  const config = environment.tenants[tenant];

  return new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: config.authority,
      // Hoy va vacio: login.microsoftonline.com es de confianza para MSAL. Se mantiene
      // configurable porque un tenant de Entra External ID usa *.ciamlogin.com, que NO lo es,
      // y sin declararlo el login falla con "authority no reconocida".
      knownAuthorities: config.knownAuthorities,
      redirectUri: environment.redirectUri,
      postLogoutRedirectUri: environment.postLogoutRedirectUri,
    },
    cache: {
      // sessionStorage: el token no sobrevive al cierre de la pestaña. localStorage daria
      // SSO entre pestañas, a cambio de dejar la credencial en disco. Con el flujo de
      // redirect, cualquiera de los dos funciona.
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
    system: {
      loggerOptions: {
        logLevel: environment.production ? LogLevel.Error : LogLevel.Warning,
        piiLoggingEnabled: false,
        loggerCallback: (_nivel, mensaje) => console.warn('[MSAL]', mensaje),
      },
    },
  });
}

/**
 * Configuracion del MsalGuard.
 *
 * `InteractionType.Redirect` y no Popup: un popup bloqueado por el navegador deja la
 * presentacion sin login, y el redirect no se puede bloquear.
 *
 * El scope es **el propio de la API**, no `user.read`. Pedir un scope de Microsoft Graph
 * devuelve un token cuyo `aud` es Graph: el login se ve perfecto y el BFF responde 401,
 * porque su validador de audience lo rechaza.
 */
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: [scopeActivo()],
    },
    loginFailedRoute: '/login',
  };
}

/**
 * Mapa de recursos protegidos: a que URLs adjuntar el token y con que scope.
 *
 * Solo se protegen las rutas del API Gateway del grupo que corresponde al tenant activo. El
 * token no se adjunta a ningun otro origen, para no filtrar una credencial a un tercero.
 *
 * Las rutas estan partidas en /staff y /guest porque un JWT Authorizer valida un solo issuer
 * y el sistema tiene dos tenants. Ver infra/docs/contracts/rutas-gateway.md.
 */
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const tenant = tenantSeleccionado();
  const prefijo = tenant === 'guest' ? 'guest' : 'staff';
  const scope = scopeActivo();

  const protectedResourceMap = new Map<
    string,
    Array<string | ProtectedResourceScopes> | null
  >();
  protectedResourceMap.set(`${environment.apiBaseUrl}/${prefijo}/*`, [scope]);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}

/**
 * Providers del modo MSAL.
 *
 * `provideAppInitializer` es obligatorio desde MSAL v3: hay que llamar a `initialize()` antes
 * de cualquier otra operacion, y a `handleRedirectPromise()` para procesar la respuesta cuando
 * el navegador vuelve del proveedor de identidad. Sin lo segundo, el login por redirect se
 * queda colgado al regresar.
 */
export function proveerMsal(): Array<Provider | EnvironmentProviders> {
  return [
    { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
    provideAppInitializer(async () => {
      const instancia = inject(MSAL_INSTANCE) as IPublicClientApplication;
      await instancia.initialize();
      await instancia.handleRedirectPromise();
    }),
    { provide: MSAL_GUARD_CONFIG, useFactory: MSALGuardConfigFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: MSALInterceptorConfigFactory },
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
    MsalService,
    MsalGuard,
    MsalBroadcastService,
  ];
}
