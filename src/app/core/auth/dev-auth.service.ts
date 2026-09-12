import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TenantKey } from '../../../environments/environment.model';
import { AuthService } from './auth.service';
import { Identidad, Rol, identidadDesdeToken } from './roles';

const CLAVE_TOKEN = 'andesstay.dev.token';
const CLAVE_TENANT = 'andesstay.dev.tenant';

/**
 * Autenticacion de desarrollo, sin Azure.
 *
 * Pide un token al emisor local del BFF (`POST /dev/token`), que lo firma con una clave RSA
 * generada al arrancar. El token es real: viaja en la cabecera, lo valida el mismo resolver
 * multi-emisor que valida los de Azure y respeta la autorizacion por rol. Lo unico simulado
 * es de donde sale la identidad.
 *
 * Sirve para desarrollar y para probar los 403 de cada rol sin crear usuarios reales.
 */
@Injectable()
export class DevAuthService extends AuthService {
  private readonly http = inject(HttpClient);
  private readonly estado = signal<Identidad | null>(leerDeSesion());

  override readonly identidad: Signal<Identidad | null> = this.estado.asReadonly();

  override get tenant(): TenantKey | null {
    return (sessionStorage.getItem(CLAVE_TENANT) as TenantKey) ?? null;
  }

  override estaAutenticado(): boolean {
    return this.estado() !== null;
  }

  override tiene(...roles: Rol[]): boolean {
    const actuales = this.estado()?.roles ?? [];
    return roles.some((rol) => actuales.includes(rol));
  }

  override login(tenant: TenantKey, rolesSolicitados: Rol[] = []): Observable<Identidad> {
    const roles =
      rolesSolicitados.length > 0
        ? rolesSolicitados
        : tenant === 'guest'
          ? (['Huesped'] as Rol[])
          : (['Recepcionista'] as Rol[]);

    return this.http
      .post<{ access_token: string }>(environment.devTokenUrl, {
        subject: `${roles[0].toLowerCase()}.dev`,
        roles,
        tenant,
        expiraEnMinutos: 60,
      })
      .pipe(
        map((respuesta) => {
          sessionStorage.setItem(CLAVE_TOKEN, respuesta.access_token);
          sessionStorage.setItem(CLAVE_TENANT, tenant);
          const identidad = identidadDesdeToken(respuesta.access_token);
          this.estado.set(identidad);
          return identidad;
        }),
      );
  }

  override logout(): void {
    sessionStorage.removeItem(CLAVE_TOKEN);
    sessionStorage.removeItem(CLAVE_TENANT);
    this.estado.set(null);
  }

  override obtenerToken(): Observable<string | null> {
    return of(this.estaAutenticado() ? sessionStorage.getItem(CLAVE_TOKEN) : null);
  }
}

/** Recupera la sesion tras recargar la pagina, descartando tokens ya expirados. */
function leerDeSesion(): Identidad | null {
  const token = sessionStorage.getItem(CLAVE_TOKEN);
  if (!token) {
    return null;
  }
  try {
    const identidad = identidadDesdeToken(token);
    return identidad.expira.getTime() > Date.now() ? identidad : null;
  } catch {
    return null;
  }
}
