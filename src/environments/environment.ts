import { AppEnvironment } from './environment.model';

/**
 * Configuracion de desarrollo.
 *
 * Con `authMode: 'dev'` la aplicacion no toca Azure: pide tokens al emisor local del BFF
 * (`POST /dev/token`), que los firma con una clave generada al arrancar. Permite probar el
 * sistema completo, incluida la autorizacion por rol, sin tener los tenants configurados.
 *
 * Para probar contra Azure, cambiar `authMode` a 'msal' y completar los dos tenants con los
 * valores de infra/docs/idaas/tenants.md.
 */
export const environment: AppEnvironment = {
  production: false,
  authMode: 'dev',

  // En dev el frontend habla directo con el BFF. En la nube habla con el API Gateway.
  apiBaseUrl: 'http://localhost:8080',
  devTokenUrl: 'http://localhost:8080/dev/token',

  tenants: {
    staff: {
      // clientId y scope identifican la APLICACION. authority identifica el TENANT.
      // Son dos GUID distintos: no intercambiarlos.
      clientId: 'da4e2482-c0e7-41d8-a298-b45a59c8d6bc',
      authority: 'https://login.microsoftonline.com/cfe8706e-e5ae-44dd-8092-b4941bda8bd9',
      scope: 'api://da4e2482-c0e7-41d8-a298-b45a59c8d6bc/access_as_staff',
      knownAuthorities: [],
    },
    guest: {
      // Misma authority que el personal: es el mismo tenant. Lo que cambia es la aplicacion.
      // Completar con los datos de AndesStay-Guest cuando exista (parte A de la guia).
      clientId: '<guest-client-id>',
      authority: 'https://login.microsoftonline.com/cfe8706e-e5ae-44dd-8092-b4941bda8bd9',
      scope: 'api://<guest-client-id>/access_as_guest',
      knownAuthorities: [],
    },
  },

  redirectUri: 'http://localhost:4200',
  postLogoutRedirectUri: 'http://localhost:4200/login',
};
