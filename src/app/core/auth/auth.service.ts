import { Signal } from '@angular/core';
import { Observable } from 'rxjs';

import { TenantKey } from '../../../environments/environment.model';
import { Identidad, Rol } from './roles';

/**
 * Contrato de autenticacion.
 *
 * Tiene dos implementaciones: `DevAuthService`, que pide tokens al emisor local del BFF, y
 * `MsalAuthService`, que envuelve `MsalService` para usar los tenants reales. El interceptor,
 * los guards y las pantallas dependen solo de esta interfaz, asi que cambiar de modo no toca
 * ninguna otra parte del codigo.
 *
 * La identidad se expone como `Signal` y no como getter: la aplicacion usa deteccion de
 * cambios zoneless, donde leer estado mutable desde una plantilla provoca
 * ExpressionChangedAfterItHasBeenChecked. Con un signal, Angular sabe cuando reevaluar.
 */
export abstract class AuthService {
  /** Identidad derivada de los claims del token. `null` si no hay sesion vigente. */
  abstract readonly identidad: Signal<Identidad | null>;

  /** Tenant elegido en la pantalla de login. Determina la ruta del API Gateway. */
  abstract get tenant(): TenantKey | null;

  abstract estaAutenticado(): boolean;

  abstract tiene(...roles: Rol[]): boolean;

  /** Inicia sesion en el tenant indicado. */
  abstract login(tenant: TenantKey, rolesSolicitados?: Rol[]): Observable<Identidad>;

  abstract logout(): void;

  /** Access token vigente, o null. */
  abstract obtenerToken(): Observable<string | null>;
}
