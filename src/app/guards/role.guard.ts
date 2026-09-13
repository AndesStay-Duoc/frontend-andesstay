import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

/**
 * Guarda que verifica si el usuario autenticado tiene alguno de los roles
 * requeridos por la ruta (definidos en data.roles).
 *
 * Los roles vienen del claim "roles" del token JWT de Azure AD.
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private msal: MsalService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRoles: string[] = route.data['roles'] ?? [];
    const account = this.msal.instance.getActiveAccount();

    if (!account) {
      this.router.navigate(['/login']);
      return false;
    }

    const tokenRoles: string[] = (account.idTokenClaims as any)?.['roles'] ?? [];
    const hasRole = requiredRoles.some(r => tokenRoles.includes(r));

    if (!hasRole) {
      // Redirige al dashboard si no tiene el rol requerido
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}
