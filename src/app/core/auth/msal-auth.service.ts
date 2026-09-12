import { Injectable, Signal, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { Observable, from, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TenantKey } from '../../../environments/environment.model';
import { AuthService } from './auth.service';
import { scopeActivo, seleccionarTenant, tenantSeleccionado } from './msal.config';
import { Identidad, Rol, identidadDesdeToken } from './roles';

/**
 * Adaptador entre `MsalService` y el contrato `AuthService` de la aplicacion.
 *
 * No reimplementa nada de MSAL: el inicio de sesion, la renovacion silenciosa y el cache los
 * hace la libreria, y el token lo adjunta `MsalInterceptor` segun el `protectedResourceMap`.
 * Esta clase solo traduce lo que MSAL expone a lo que necesitan las pantallas y el guard de
 * roles: la identidad derivada de los claims del token.
 *
 * `MsalGuard` verifica que haya sesion, pero no mira roles. El chequeo por rol vive aqui,
 * leyendo el claim `roles`. Ver infra/docs/contracts/roles.md.
 */
@Injectable()
export class MsalAuthService extends AuthService {
  private readonly msal = inject(MsalService);
  private readonly estado = signal<Identidad | null>(null);

  override readonly identidad: Signal<Identidad | null> = this.estado.asReadonly();

  override get tenant(): TenantKey | null {
    return this.estaAutenticado() ? tenantSeleccionado() : null;
  }

  override estaAutenticado(): boolean {
    return this.msal.instance.getAllAccounts().length > 0;
  }

  override tiene(...roles: Rol[]): boolean {
    const actuales = this.estado()?.roles ?? [];
    return roles.some((rol) => actuales.includes(rol));
  }

  /**
   * Inicia sesion en el tenant indicado.
   *
   * Si el tenant elegido no es el que tiene cargada la instancia de MSAL, hay que recargar:
   * `MSAL_INSTANCE` se resuelve una sola vez al arrancar y queda atado a una authority. Se
   * guarda la eleccion y se recarga; al volver, el factory construye la instancia correcta y
   * la pantalla de login dispara el redirect.
   */
  override login(tenant: TenantKey): Observable<Identidad> {
    if (tenant !== tenantSeleccionado()) {
      seleccionarTenant(tenant);
      window.location.reload();
      return of();
    }

    return this.msal
      .loginRedirect({ scopes: [scopeActivo()] })
      .pipe(map(() => this.estado() as Identidad));
  }

  override logout(): void {
    this.estado.set(null);
    this.msal.logoutRedirect({
      postLogoutRedirectUri: environment.postLogoutRedirectUri,
    });
  }

  /**
   * Access token vigente, para las pantallas que necesiten mostrar sus claims.
   *
   * Las peticiones al backend no pasan por aca: de eso se encarga `MsalInterceptor`. Este
   * metodo existe para poder decodificar el token y mostrar roles y scopes en el panel, que
   * es la evidencia de que se leen del token y no estan escritos en el codigo.
   */
  override obtenerToken(): Observable<string | null> {
    const cuentas = this.msal.instance.getAllAccounts();
    if (cuentas.length === 0) {
      return of(null);
    }

    const renovar = async (): Promise<string | null> => {
      try {
        const resultado = await this.msal.instance.acquireTokenSilent({
          scopes: [scopeActivo()],
          account: cuentas[0],
        });
        this.estado.set(identidadDesdeToken(resultado.accessToken));
        return resultado.accessToken;
      } catch {
        // Renovar exige interaccion: el guard se encarga de mandar al login.
        return null;
      }
    };

    return from(renovar());
  }
}
