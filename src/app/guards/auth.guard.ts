import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Protege las rutas privadas: solo deja pasar si hay una cuenta de Azure AD en sesión.
 *
 * Espera a que MSAL termine cualquier interacción en curso (procesar el redirect
 * de login, renovar tokens) antes de decidir; así no manda a /login a un usuario
 * que justo vuelve autenticado desde Microsoft. Antes de activar la ruta carga los
 * roles efectivos, para que el menú y el dashboard ya los tengan disponibles.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.whenReady().pipe(
      switchMap(() => {
        if (!this.auth.isAuthenticated()) {
          return of(this.router.createUrlTree(['/login']));
        }
        return this.auth.loadRoles().pipe(map(() => true));
      })
    );
  }
}
