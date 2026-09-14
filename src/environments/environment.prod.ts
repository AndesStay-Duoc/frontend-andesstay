export const environment = {
  production: true,

  msalConfig: {
    auth: {
      clientId: '704a544f-3d92-44f5-aef9-8559574cff34',
      authority: 'https://login.microsoftonline.com/055d11d1-8ae0-4221-a6f7-b50be0a623b4',
      // COMPLETAR ANTES DEL DESPLIEGUE: URL pública del frontend.
      // Debe estar registrada como "Single-page application" en el App Registration.
      redirectUri: 'https://tu-dominio.com',
      postLogoutRedirectUri: 'https://tu-dominio.com/login'
    }
  },

  // Scope expuesto por la API en Azure AD (App Registration → Expose an API).
  apiConfig: {
    scopes: ['api://704a544f-3d92-44f5-aef9-8559574cff34/AndesStay.Access'],
    // COMPLETAR ANTES DEL DESPLIEGUE: Invoke URL del AWS API Gateway (HTTP API)
    // con JWT Authorizer. Flujo: JWT → API Gateway → ms-andesstay-bff → microservicio.
    // Formato: https://<api-id>.execute-api.<region>.amazonaws.com (sin "/" final).
    // El placeholder de abajo NO es una URL real.
    uri: 'https://API_GATEWAY_ID.execute-api.REGION.amazonaws.com'
  }
};
