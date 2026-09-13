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

  // Scopes que el frontend pide al token (el scope de tu API backend)
  apiConfig: {
    scopes: ['api://704a544f-3d92-44f5-aef9-8559574cff34/access_as_user'],
    uri: 'http://localhost:8080'   // BFF URL
  }
};
