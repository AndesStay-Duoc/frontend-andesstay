/** Un tenant de Microsoft Entra, tal como lo necesita MSAL. */
export interface TenantConfig {
  /** Application (client) ID del App Registration. */
  clientId: string;
  /** Authority sin el sufijo /v2.0: MSAL lo agrega. */
  authority: string;
  /** Scope completo a pedir: `api://<client-id>/access_as_*`. */
  scope: string;
  /**
   * Dominios de authority que MSAL debe confiar.
   *
   * Vacio cuando la authority es `login.microsoftonline.com`, que MSAL confia por defecto.
   * Hay que completarlo si algun dia se usa un tenant de Entra External ID, cuyo dominio
   * `*.ciamlogin.com` no esta en esa lista: sin declararlo, el login falla con un error de
   * authority no reconocida.
   */
  knownAuthorities: string[];
}

/** Cual de los dos tenants se esta usando. Determina la ruta del API Gateway. */
export type TenantKey = 'staff' | 'guest';

/**
 * `dev` usa el emisor local del BFF y no requiere Azure.
 * `msal` usa los tenants reales con Authorization Code + PKCE.
 */
export type AuthMode = 'dev' | 'msal';

export interface AppEnvironment {
  production: boolean;
  authMode: AuthMode;
  apiBaseUrl: string;
  devTokenUrl: string;
  tenants: Record<TenantKey, TenantConfig>;
  redirectUri: string;
  postLogoutRedirectUri: string;
}
