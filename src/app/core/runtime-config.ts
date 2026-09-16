import { environment } from '../../environments/environment';

/**
 * Configuración que la aplicación resuelve EN TIEMPO DE EJECUCIÓN, leyendo
 * assets/config.json antes de arrancar.
 *
 * Motivo: Angular compila el contenido de environment.*.ts dentro del bundle.
 * En el despliegue sobre AWS Learner Lab, la IP pública y los identificadores
 * del API Gateway cambian cada vez que el laboratorio se reinicia, de modo que
 * depender solo de environment.prod.ts obligaría a recompilar la SPA entera en
 * mitad de una demostración. Con este archivo basta editar un JSON y reiniciar
 * el contenedor de nginx.
 *
 * El archivo assets/config.json lo genera el entrypoint del contenedor a partir
 * de las variables de entorno. En desarrollo local no existe o viene con los
 * valores de localhost, y entonces se usan los de environment.
 */
export interface RuntimeConfig {
  /** Application (client) ID del App Registration de Entra ID */
  clientId: string;
  /** Authority del tenant: https://login.microsoftonline.com/<tenant-id> */
  authority: string;
  /** Debe coincidir carácter por carácter con un Redirect URI registrado */
  redirectUri: string;
  postLogoutRedirectUri: string;
  /** Origen del API Gateway con las rutas protegidas */
  apiUri: string;
  /** Scopes que MSAL solicita para el access token */
  scopes: string[];
}

/**
 * Valores de respaldo tomados de environment. Se usan cuando config.json no
 * existe (ng serve) o cuando alguno de sus campos viene vacío.
 */
function fallbackConfig(): RuntimeConfig {
  const auth = environment.msalConfig.auth;

  // environment.prod.ts deja redirectUri vacío a propósito. El origen actual es
  // el valor correcto: la SPA se sirve desde el mismo host que se registró como
  // Redirect URI en Entra ID. Si se dejara vacío, MSAL usaría
  // window.location.href, que incluye la ruta y no coincidiría con lo
  // registrado (AADSTS50011).
  const origin = window.location.origin;

  return {
    clientId: auth.clientId,
    authority: auth.authority,
    redirectUri: auth.redirectUri || origin,
    postLogoutRedirectUri: auth.postLogoutRedirectUri || `${origin}/login`,
    apiUri: environment.apiConfig.uri,
    scopes: environment.apiConfig.scopes
  };
}

let resolvedConfig: RuntimeConfig = fallbackConfig();

/**
 * Descarta los campos vacíos del JSON para que no pisen a los de environment.
 * El generador de config.json escribe cadenas vacías cuando una variable de
 * entorno no está definida, y una authority vacía rompería MSAL en el arranque.
 */
function mergeConfig(base: RuntimeConfig, incoming: Partial<RuntimeConfig>): RuntimeConfig {
  const merged: RuntimeConfig = { ...base };

  // Solo se copian las claves conocidas: el config.json de desarrollo lleva un
  // campo "_comentario" que no tiene por qué acabar en la configuración.
  const keys: Array<keyof RuntimeConfig> = [
    'clientId', 'authority', 'redirectUri', 'postLogoutRedirectUri', 'apiUri', 'scopes'
  ];

  for (const key of keys) {
    const value = incoming[key];
    if (typeof value === 'string' && value.trim() !== '') {
      (merged[key] as string) = value.trim();
    } else if (Array.isArray(value) && value.length > 0) {
      (merged[key] as string[]) = value;
    }
  }

  return merged;
}

/**
 * Carga assets/config.json. Se invoca desde main.ts ANTES de
 * bootstrapApplication, porque MSALInstanceFactory se ejecuta durante la
 * construcción de los proveedores, es decir antes que cualquier
 * APP_INITIALIZER.
 *
 * Nunca lanza: si el archivo falta o está mal formado, la aplicación arranca
 * con los valores de environment y deja el motivo en la consola.
 */
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const base = fallbackConfig();

  try {
    // no-store, porque este archivo es justamente el que cambia entre sesiones
    const response = await fetch('assets/config.json', { cache: 'no-store' });

    if (!response.ok) {
      console.warn(`[config] assets/config.json devolvió ${response.status}; se usan los valores de environment`);
      resolvedConfig = base;
      return resolvedConfig;
    }

    const raw = (await response.json()) as Partial<RuntimeConfig>;
    resolvedConfig = mergeConfig(base, raw);

    if (resolvedConfig.apiUri.trim() === '') {
      console.warn('[config] apiUri sin definir: revisar PUBLIC_API_ORIGIN en el .env compartido');
    }

    return resolvedConfig;
  } catch (error) {
    console.warn('[config] no se pudo leer assets/config.json; se usan los valores de environment', error);
    resolvedConfig = base;
    return resolvedConfig;
  }
}

/**
 * Devuelve la configuración ya resuelta. Solo tiene valores reales después de
 * que loadRuntimeConfig() se haya completado.
 */
export function getRuntimeConfig(): RuntimeConfig {
  return resolvedConfig;
}
