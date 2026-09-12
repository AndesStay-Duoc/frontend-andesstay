import { AppEnvironment } from './environment.model';

/**
 * Configuracion de produccion.
 *
 * `apiBaseUrl` apunta al API Gateway, nunca al BFF directo: el camino seguro es siempre
 * JWT -> API Gateway -> BFF -> microservicio de dominio.
 *
 * Los valores se completan con los de infra/docs/idaas/tenants.md. No son secretos: son
 * identificadores publicos de cliente.
 *
 * Recordar registrar la URL publica del frontend como redirect URI en AMBOS App
 * Registrations. Si falta, el login funciona en local y falla en la demo.
 */
export const environment: AppEnvironment = {
  production: true,
  authMode: 'msal',

  apiBaseUrl: 'https://<api-id>.execute-api.us-east-1.amazonaws.com',
  devTokenUrl: '',

  tenants: {
    staff: {
      clientId: 'da4e2482-c0e7-41d8-a298-b45a59c8d6bc',
      authority: 'https://login.microsoftonline.com/cfe8706e-e5ae-44dd-8092-b4941bda8bd9',
      scope: 'api://da4e2482-c0e7-41d8-a298-b45a59c8d6bc/access_as_staff',
      knownAuthorities: [],
    },
    guest: {
      // Misma authority que el personal: es el mismo tenant.
      clientId: '<guest-client-id>',
      authority: 'https://login.microsoftonline.com/cfe8706e-e5ae-44dd-8092-b4941bda8bd9',
      scope: 'api://<guest-client-id>/access_as_guest',
      knownAuthorities: [],
    },
  },

  redirectUri: 'https://<url-publica-del-frontend>',
  postLogoutRedirectUri: 'https://<url-publica-del-frontend>/login',
};
