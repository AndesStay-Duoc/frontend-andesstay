import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Guarda que verifica si el usuario autenticado tiene alguno de los roles
 * requeridos por la ruta (definidos en data.roles).
 *
 * Los roles son los efectivos que devuelve GET /api/me: los App Roles de Azure AD
 * más el rol Cliente que el backend deriva para huéspedes autoregistrados.
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredRoles: string[] = route.data['roles'] ?? [];

    return this.auth.whenReady().pipe(
      switchMap(() => {
        if (!this.auth.isAuthenticated()) {
          return of(this.router.createUrlTree(['/login']));
        }
        return this.auth.loadRoles().pipe(
          map(roles => {
            if (requiredRoles.length === 0 || requiredRoles.some(role => roles.includes(role))) {
              return true;
            }
            // Autenticado pero sin el rol requerido: vuelve al dashboard
            return this.router.createUrlTree(['/dashboard']);
          })
        );
      })
    );
  }
}
