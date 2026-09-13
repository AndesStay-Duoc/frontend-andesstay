export const environment = {
  production: true,

  msalConfig: {
    auth: {
      clientId: '704a544f-3d92-44f5-aef9-8559574cff34',
      authority: 'https://login.microsoftonline.com/055d11d1-8ae0-4221-a6f7-b50be0a623b4',
      redirectUri: 'https://tu-dominio.com',          // Reemplazar con la URL de producción
      postLogoutRedirectUri: 'https://tu-dominio.com/login'  // Reemplazar con la URL de producción
    }
  },

  // IMPORTANTE: el scope debe coincidir con el registrado en Azure AD App Registration.
  // Se usa 'access_as_user' (igual que en el entorno de desarrollo) para mantener
  // consistencia. Si en producción tienes un scope diferente, actualiza AMBOS entornos.
  apiConfig: {
    scopes: ['api://704a544f-3d92-44f5-aef9-8559574cff34/access_as_user'],
    uri: 'https://tu-bff.tu-dominio.com'   // Reemplazar con la URL del BFF en producción
  }
};
