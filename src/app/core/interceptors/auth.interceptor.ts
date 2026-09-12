import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

/**
 * Adjunta el token en modo desarrollo.
 *
 * En modo MSAL no hace nada: de adjuntar el token se encarga `MsalInterceptor` segun el
 * `protectedResourceMap`. Este interceptor existe solo para el emisor local, que no pasa por
 * MSAL.
 *
 * El token se adjunta unicamente a peticiones al backend, nunca a otros origenes, y nunca al
 * endpoint que emite el token, que es publico.
 */
export const devAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.authMode !== 'dev') {
    return next(req);
  }

  const esDelBackend = req.url.startsWith(environment.apiBaseUrl);
  const esEmisionDeToken = environment.devTokenUrl !== '' && req.url === environment.devTokenUrl;

  if (!esDelBackend || esEmisionDeToken) {
    return next(req);
  }

  const auth = inject(AuthService);
  return auth.obtenerToken().pipe(
    switchMap((token) =>
      next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req),
    ),
  );
};
