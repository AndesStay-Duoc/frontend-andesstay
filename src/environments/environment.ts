export const environment = {
  production: false,

  msalConfig: {
    auth: {
      clientId: '704a544f-3d92-44f5-aef9-8559574cff34',
      authority: 'https://login.microsoftonline.com/055d11d1-8ae0-4221-a6f7-b50be0a623b4',
      redirectUri: 'http://localhost:4200',
      postLogoutRedirectUri: 'http://localhost:4200/login',
    }
  },

  // Scope expuesto por la API en Azure AD (App Registration → Expose an API).
  // Lo usan MsalInterceptor y acquireTokenSilent para obtener el access token.
  apiConfig: {
    scopes: ['api://704a544f-3d92-44f5-aef9-8559574cff34/AndesStay.Access'],
    uri: 'http://localhost:8080'   // BFF local (en producción: API Gateway)
  }
};
