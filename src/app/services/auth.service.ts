import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AccountInfo, InteractionStatus } from '@azure/msal-browser';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, take, tap } from 'rxjs/operators';
import { getRuntimeConfig } from '../core/runtime-config';

/** Claims relevantes del access token emitido por Azure AD para la API. */
export interface AccessTokenClaims {
  roles: string[];
  scopes: string[];
  audience?: string;
  expiresAt?: Date;
}

/** Parte de la respuesta de GET /api/me que usa el frontend. */
interface MeResponse {
  roles?: string[];
  effectiveRoles?: string[];
}

/**
 * Punto único para consultar la sesión MSAL:
 *  - cuenta activa
 *  - roles efectivos (GET /api/me del BFF; respaldo: claim "roles" del ID token)
 *  - scopes (claim "scp" del access token de la API)
 */
@Injectable({ providedIn: 'root' })
export class AuthService {

  /** Roles efectivos cargados desde el BFF y la cuenta a la que pertenecen. */
  private effectiveRoles: string[] | null = null;
  private effectiveRolesAccountId: string | null = null;

  constructor(
    private msal: MsalService,
    private broadcast: MsalBroadcastService,
    private http: HttpClient
  ) {}

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

  /**
   * Carga, una vez por cuenta, los roles efectivos que calcula el BFF en GET /api/me.
   *
   * Un huésped autoregistrado no tiene App Roles en Azure: su ID token llega sin claim
   * "roles" y el backend le deriva el rol Cliente. Por eso la UI no puede decidir solo
   * con el ID token. Si el BFF no responde, se usan los roles del ID token sin
   * guardarlos, para reintentar en la próxima navegación.
   */
  loadRoles(): Observable<string[]> {
    const account = this.getAccount();
    if (!account) {
      this.clearRoles();
      return of([]);
    }
    if (this.effectiveRoles && this.effectiveRolesAccountId === account.homeAccountId) {
      return of(this.effectiveRoles);
    }
    return this.http.get<MeResponse>(`${getRuntimeConfig().apiUri}/api/me`).pipe(
      map(me => me.effectiveRoles ?? me.roles ?? []),
      tap(roles => {
        this.effectiveRoles = roles;
        this.effectiveRolesAccountId = account.homeAccountId;
      }),
      catchError(err => {
        console.warn('No se pudieron obtener los roles desde /api/me; se usan los del ID token.', err);
        return of(this.idTokenRoles());
      })
    );
  }

  /** Roles de la sesión: los efectivos si ya se cargaron; si no, los del ID token. */
  getRoles(): string[] {
    const account = this.getAccount();
    if (account && this.effectiveRoles && this.effectiveRolesAccountId === account.homeAccountId) {
      return this.effectiveRoles;
    }
    return this.idTokenRoles();
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

    return this.msal.acquireTokenSilent({ scopes: getRuntimeConfig().scopes, account }).pipe(
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
    const account = this.getAccount();
    this.clearRoles();
    this.msal.logoutRedirect({
      account,
      postLogoutRedirectUri: getRuntimeConfig().postLogoutRedirectUri
    }).subscribe({
      error: err => console.error('Error al cerrar sesión:', err)
    });
  }

  /** App Roles asignados en Azure, leídos del claim "roles" del ID token. */
  private idTokenRoles(): string[] {
    const claims = this.getAccount()?.idTokenClaims as { roles?: string[] } | undefined;
    return claims?.roles ?? [];
  }

  private clearRoles(): void {
    this.effectiveRoles = null;
    this.effectiveRolesAccountId = null;
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
