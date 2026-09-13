# frontend-andesstay

Frontend SPA en **Angular 17** para la plataforma AndesStay.  
Autenticación con **Azure AD** (MSAL), comunicación con el BFF vía Bearer token.

---

## Tecnologías

| Tecnología | Versión |
|---|---|
| Angular | 17.3.x |
| @azure/msal-angular | ^3.0.18 |
| @azure/msal-browser | ^3.14.0 |
| TypeScript | ~5.4.x |

---

## Estructura de rutas

| Ruta | Componente | Roles permitidos |
|---|---|---|
| `/login` | LoginComponent | Público |
| `/dashboard` | DashboardComponent | Cualquier usuario autenticado |
| `/reservations` | ReservationsComponent | Admin, Operador, Cliente |
| `/catalog` | CatalogComponent | Admin, Operador |
| `/reports` | ReportsComponent | Admin |
| `/audit` | AuditComponent | Admin, Auditor |

---

## Pre-requisitos

- Node 18+
- Angular CLI 17: `npm install -g @angular/cli@17`
- App Registration configurada en Azure AD (ver guía en `infra/azure-ad-guide.md`)

---

## Configuración

Edita `src/environments/environment.ts` con tus datos reales de Azure AD:

```typescript
export const environment = {
  production: false,
  msalConfig: {
    auth: {
      clientId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',   // Application (client) ID
      authority: 'https://login.microsoftonline.com/yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',  // Tenant ID
      redirectUri: 'http://localhost:4200'
    }
  },
  apiConfig: {
    scopes: ['api://xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/AndesStay.Access'],
    uri: 'http://localhost:8080'   // URL del BFF
  }
};
```

---

## Instalación y ejecución

```bash
npm install
ng serve
# Disponible en http://localhost:4200
```

### Build de producción

```bash
ng build --configuration production
# Archivos en dist/frontend-andesstay/browser/
```

---

## Flujo de autenticación

1. Usuario accede a `/login` → hace clic en "Iniciar sesión con Microsoft"
2. MSAL redirige a `login.microsoftonline.com` (flujo OAuth2 Authorization Code con PKCE)
3. Al retornar, MSAL obtiene el ID Token con el claim `roles`
4. `MsalInterceptor` adjunta el Access Token en cada petición al BFF (`Authorization: Bearer …`)
5. `RoleGuard` verifica que el usuario tenga el rol requerido según la ruta

---

## Roles Azure AD requeridos

Los roles se configuran en el App Registration y se asignan a usuarios/grupos:

| Rol | Descripción |
|---|---|
| `Admin` | Acceso completo: reservas, catálogo, reportes, auditoría |
| `Operador` | Reservas y catálogo |
| `Cliente` | Solo consulta de sus reservas |
| `Auditor` | Solo módulo de auditoría |

---

## Variables de entorno a reemplazar

| Placeholder | Dónde obtenerlo |
|---|---|
| `TU_CLIENT_ID_AQUI` | Azure Portal → App Registrations → Overview → Application (client) ID |
| `TU_TENANT_ID_AQUI` | Azure Portal → App Registrations → Overview → Directory (tenant) ID |
