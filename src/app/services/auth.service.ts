import { Injectable } from '@angular/core';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AccountInfo, InteractionStatus } from '@azure/msal-browser';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** Claims relevantes del access token emitido por Azure AD para la API. */
export interface AccessTokenClaims {
  roles: string[];
  scopes: string[];
  audience?: string;
  expiresAt?: Date;
}

/**
 * Punto único para consultar la sesión MSAL:
 *  - cuenta activa
 *  - roles (claim "roles" del ID token)
 *  - scopes (claim "scp" del access token de la API)
 */
@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private msal: MsalService, private broadcast: MsalBroadcastService) {}

  /**
   * Emite una sola vez cuando MSAL no tiene interacciones en curso
   * (arranque, procesamiento del redirect, login, renovación de token).
   * Los guards esperan esta señal para no decidir con un estado a medias.
   */
  whenReady(): Observable<void> {
    return this.broadcast.inProgress$.pipe(
      filter(status => status === InteractionStatus.None),
      take(1),
      map(() => undefined)
    );
  }

  /** Cuenta activa; si no hay, toma la primera cuenta en caché y la marca como activa. */
  getAccount(): AccountInfo | null {
    const instance = this.msal.instance;
    let account = instance.getActiveAccount();
    if (!account) {
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        account = accounts[0];
        instance.setActiveAccount(account);
      }
    }
    return account;
  }

  isAuthenticated(): boolean {
    return this.getAccount() !== null;
  }

  /** Roles de App Roles de Azure AD leídos desde el claim "roles" del ID token. */
  getRoles(): string[] {
    const claims = this.getAccount()?.idTokenClaims as { roles?: string[] } | undefined;
    return claims?.roles ?? [];
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getRoles();
    return roles.some(role => userRoles.includes(role));
  }

  /**
   * Obtiene (desde caché o renovándolo en silencio) el access token de la API
   * y lee sus claims "roles" y "scp".
   */
  getAccessTokenClaims(): Observable<AccessTokenClaims> {
    const account = this.getAccount();
    if (!account) {
      return of({ roles: [], scopes: [] });
    }

    return this.msal.acquireTokenSilent({ scopes: environment.apiConfig.scopes, account }).pipe(
      map(result => {
        const payload = decodeJwtPayload(result.accessToken);
        const scp = typeof payload['scp'] === 'string' ? payload['scp'] : '';
        return {
          roles: Array.isArray(payload['roles']) ? payload['roles'] as string[] : [],
          scopes: scp ? scp.split(' ') : result.scopes,
          audience: payload['aud'] as string | undefined,
          expiresAt: result.expiresOn ?? undefined
        };
      }),
      catchError(err => {
        console.error('No se pudo obtener el access token de la API:', err);
        return of({ roles: [], scopes: [] });
      })
    );
  }

  /** Scopes concedidos en el access token (claim "scp"), p. ej. ["AndesStay.Access"]. */
  getScopes(): Observable<string[]> {
    return this.getAccessTokenClaims().pipe(map(claims => claims.scopes));
  }

  logout(): void {
    this.msal.logoutRedirect({
      account: this.getAccount(),
      postLogoutRedirectUri: environment.msalConfig.auth.postLogoutRedirectUri
    }).subscribe({
      error: err => console.error('Error al cerrar sesión:', err)
    });
  }
}

/** Decodifica el payload (base64url) de un JWT sin validar la firma; la valida el backend. */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return {};
  }
}
