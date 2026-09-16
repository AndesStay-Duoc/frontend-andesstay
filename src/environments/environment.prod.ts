/**
 * Valores de RESPALDO para el build de producción.
 *
 * La configuración efectiva se resuelve en tiempo de ejecución desde
 * assets/config.json (ver src/app/core/runtime-config.ts). Este archivo solo
 * aporta los campos que ese JSON deje vacíos.
 *
 * El motivo es que Angular compila estos valores dentro del bundle, y en el
 * despliegue sobre AWS Learner Lab la IP pública y los identificadores del API
 * Gateway cambian en cada reinicio del laboratorio: recompilar la SPA por cada
 * cambio de endpoint no es viable durante una demostración.
 *
 * Por eso aquí NO se escriben URLs de producción. Las reales viajan en las
 * variables PUBLIC_WEB_ORIGIN y PUBLIC_API_ORIGIN del .env compartido.
 */
export const environment = {
  production: true,

  msalConfig: {
    auth: {
      // Identificadores públicos del App Registration (no son secretos)
      clientId: '704a544f-3d92-44f5-aef9-8559574cff34',
      authority: 'https://login.microsoftonline.com/055d11d1-8ae0-4221-a6f7-b50be0a623b4',

      // Cadena vacía a propósito: runtime-config.ts toma window.location.origin,
      // que es exactamente el origen registrado como Redirect URI en Entra ID.
      // Poner aquí un dominio equivocado provoca AADSTS50011 sin pista clara.
      redirectUri: '',
      postLogoutRedirectUri: ''
    }
  },

  apiConfig: {
    // Scope expuesto por la API en Entra ID (App Registration → Expose an API)
    scopes: ['api://704a544f-3d92-44f5-aef9-8559574cff34/AndesStay.Access'],

    // Lo entrega assets/config.json a partir de PUBLIC_API_ORIGIN
    uri: ''
  }
};
