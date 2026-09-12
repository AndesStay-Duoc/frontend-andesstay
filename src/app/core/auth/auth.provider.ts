import { EnvironmentProviders, Provider } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { DevAuthService } from './dev-auth.service';
import { MsalAuthService } from './msal-auth.service';
import { proveerMsal } from './msal.config';

/**
 * Elige el modo de autenticacion segun el entorno.
 *
 * Es el unico lugar del codigo que conoce los dos modos. Todo lo demas depende de la interfaz
 * `AuthService`, asi que pasar de desarrollo a Azure es cambiar `authMode` en el environment.
 *
 * - `msal`: los providers de @azure/msal-angular. `MsalInterceptor` adjunta el token y
 *   `MsalGuard` exige sesion.
 * - `dev`: el emisor local del BFF, sin Azure. El token lo adjunta un interceptor funcional
 *   propio.
 */
export function proveerAutenticacion(): Array<Provider | EnvironmentProviders> {
  return environment.authMode === 'msal'
    ? [...proveerMsal(), MsalAuthService, { provide: AuthService, useExisting: MsalAuthService }]
    : [DevAuthService, { provide: AuthService, useExisting: DevAuthService }];
}
