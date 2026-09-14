import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Guarda que verifica si el usuario autenticado tiene alguno de los roles
 * requeridos por la ruta (definidos en data.roles).
 *
 * Los roles vienen del claim "roles" del token JWT de Azure AD (App Roles).
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredRoles: string[] = route.data['roles'] ?? [];

    return this.auth.whenReady().pipe(
      map(() => {
        if (!this.auth.isAuthenticated()) {
          return this.router.createUrlTree(['/login']);
        }
        if (requiredRoles.length === 0 || this.auth.hasAnyRole(requiredRoles)) {
          return true;
        }
        // Autenticado pero sin el rol requerido: vuelve al dashboard
        return this.router.createUrlTree(['/dashboard']);
      })
    );
  }
}
