# frontend-andesstay

Frontend de **AndesStay**, la plataforma de reservas de hostales, cabañas y lodges.

Angular con MSAL. Autentica contra **dos tenants** de Microsoft Entra y consume el backend
exclusivamente a través del API Gateway.

## Estado

Funcional en modo desarrollo: login, guards por rol y consumo del backend verificados en el
navegador. El modo MSAL está cableado pero no probado contra Azure todavía, porque falta crear
los tenants.

## Los dos tenants

| | Personal | Huéspedes |
|---|---|---|
| Producto | Microsoft Entra ID | Microsoft Entra External ID |
| Roles | Admin, Recepcionista, Auditor | Huésped |
| Alta | El administrador crea las cuentas | **Auto-registro desde `/signup`** |
| Scope | `access_as_staff` | `access_as_guest` |
| Rutas del gateway | `/staff/*` | `/guest/*` |

`AuthService` es una interfaz con dos implementaciones. En `/login` la persona elige si entra
como parte del equipo o como huésped, y esa elección determina la authority de MSAL.

### Cómo se resuelven los dos tenants

`MSAL_INSTANCE` se resuelve **una sola vez** al arrancar la aplicación y queda atado a una
authority. Por eso `MSALInstanceFactory` lee el tenant elegido desde `sessionStorage`, y cambiar
de tenant recarga la página para que la factory reconstruya la instancia correcta.

No es una limitación escondida: es consecuencia directa de que MSAL asocie una instancia a una
authority y de que AndesStay tenga dos tenants.

### Modo desarrollo

Con `authMode: 'dev'` en `src/environments/environment.ts`, la aplicación no toca Azure: pide el
token a `POST /dev/token` del BFF, que lo firma con una clave RSA generada al arrancar.

El token es **real**: lo valida el mismo resolver multi-emisor que validará los de Azure y
respeta la autorización por rol. Lo único simulado es de dónde sale la identidad. Permite
probar los 403 de cada rol sin crear usuarios reales.

Cambiar a `authMode: 'msal'` y completar los identificadores es todo lo que hace falta para
pasar a los tenants reales.

## Flujo de autenticación

Authorization Code con PKCE, en los dos tenants. Las app registrations están declaradas como
**SPA**, lo que fuerza PKCE y deshabilita el flujo implícito.

MSAL genera el `code_verifier` y el `code_challenge` solo, pero hay que poder demostrarlo: la
petición a `/authorize` debe mostrar `code_challenge_method=S256`, `state` y `nonce`. El
procedimiento está en
[`infra/docs/guias/azure-identidad.md`](https://github.com/AndesStay-Duoc/infra/blob/develop/docs/guias/azure-identidad.md),
parte D.2.

## Pantallas

| Ruta | Roles |
|---|---|
| `/login` | público — selector personal o huésped |
| `/signup` | público — dispara el user flow de registro |
| `/dashboard` | todos los autenticados |
| `/reservations` | Admin, Recepcionista, Huésped |
| `/catalog` | Admin, Recepcionista |
| `/reports` | Admin |
| `/audit` | Admin, Auditor |

## Estructura

```
src/app/
├─ core/
│  ├─ auth/
│  │  ├─ msal.config.ts        factories de MSAL_INSTANCE, MSAL_GUARD_CONFIG y MSAL_INTERCEPTOR_CONFIG
│  │  ├─ auth.service.ts       contrato, con la identidad expuesta como Signal
│  │  ├─ msal-auth.service.ts  adaptador sobre MsalService
│  │  ├─ dev-auth.service.ts   emisor local, sin Azure
│  │  ├─ auth.provider.ts      elige el modo según authMode
│  │  └─ roles.ts              decodificación de claims y tipos de rol
│  ├─ interceptors/            interceptor funcional del modo dev
│  └─ guards/                  authGuard y conRol
├─ features/                   login, dashboard, reservations
└─ environments/               environment.ts, environment.prod.ts, environment.model.ts
```

En modo MSAL el token lo adjunta **`MsalInterceptor`** según el `protectedResourceMap`, y
**`MsalGuard`** exige sesión. `MsalGuard` no mira roles: el chequeo por rol es propio y lee el
claim `roles`.

Los roles y scopes se leen **desde los claims del token**, nunca hardcodeados. El panel los
muestra decodificados, que es la evidencia de eso.

## El error de audience

Si se pide un scope de Microsoft Graph como `user.read`, el token llega con `aud` de Graph y el
BFF responde `401` aunque el login se vea perfecto. Hay que pedir **el scope propio**:

```
api://<client-id>/access_as_staff
```

Y el `protectedResourceMap` apunta al API Gateway, no a Graph.

## Stack

Angular 20.3 · TypeScript 5.9 · SCSS · `@azure/msal-angular` 6.2 con `@azure/msal-browser` 5.21.

Detección de cambios **zoneless**: la identidad se expone como `Signal`, no como getter. Leer
estado mutable desde una plantilla en modo zoneless provoca
`ExpressionChangedAfterItHasBeenChecked`.

## Configuración

Los identificadores de los tenants van en `src/environments/`. **No son secretos**: son
identificadores públicos de cliente. Se obtienen siguiendo la guía de Azure y se registran en
[`infra/docs/idaas/tenants.md`](https://github.com/AndesStay-Duoc/infra/blob/develop/docs/idaas/tenants.md).

`environment.prod.ts` apunta al API Gateway, nunca al BFF directo.

> La URL pública del frontend debe estar registrada como redirect URI en **ambas** app
> registrations. Si se olvida, el login funciona en local y falla en la demo.

## Cómo levantarlo

```bash
npm ci
```

```bash
npm start
```

Queda en `http://localhost:4200`, que es la redirect URI de desarrollo registrada en los dos
tenants.

## Tests

```bash
npm test
```

## Cómo contribuir

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md).
