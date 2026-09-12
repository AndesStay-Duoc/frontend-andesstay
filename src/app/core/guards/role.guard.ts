import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Rol } from '../auth/roles';

/**
 * Exige sesion activa.
 *
 * En modo MSAL delega en `MsalGuard`, que es quien sabe disparar el redirect al proveedor de
 * identidad cuando no hay sesion. En modo dev hace la comprobacion local.
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  if (environment.authMode === 'msal') {
    return inject(MsalGuard).canActivate(route, state);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.estaAutenticado()) {
    return true;
  }
  void router.navigate(['/login']);
  return false;
};

/**
 * Exige uno de los roles indicados, leidos del claim `roles` del token.
 *
 * Primero resuelve la autenticacion con `authGuard`, y solo despues mira el rol: `MsalGuard`
 * verifica sesion pero no roles, asi que esta parte es necesariamente propia.
 *
 * Es comodidad de interfaz, no seguridad: quien tenga el token puede llamar a la API igual. La
 * autorizacion de verdad la aplican el API Gateway y el BFF. Ver
 * infra/docs/contracts/roles.md.
 */
export function conRol(...roles: Rol[]): CanActivateFn {
  return (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const permitirPorRol = () => {
      if (auth.tiene(...roles)) {
        return true;
      }
      void router.navigate(['/dashboard']);
      return false;
    };

    if (environment.authMode === 'msal') {
      const resultado = inject(MsalGuard).canActivate(route, state);
      return resultado.pipe(map((autenticado) => (autenticado === true ? permitirPorRol() : autenticado)));
    }

    if (!auth.estaAutenticado()) {
      void router.navigate(['/login']);
      return of(false);
    }
    return of(permitirPorRol());
  };
}
