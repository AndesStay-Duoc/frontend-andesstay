import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Protege las rutas privadas: solo deja pasar si hay una cuenta de Azure AD en sesión.
 *
 * Espera a que MSAL termine cualquier interacción en curso (procesar el redirect
 * de login, renovar tokens) antes de decidir; así no manda a /login a un usuario
 * que justo vuelve autenticado desde Microsoft.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.whenReady().pipe(
      map(() => this.auth.isAuthenticated() ? true : this.router.createUrlTree(['/login']))
    );
  }
}
