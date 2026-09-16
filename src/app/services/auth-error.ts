/**
 * Errores de autenticación devueltos por Azure AD al volver de un redirect.
 *
 * El error ocurre en APP_INITIALIZER, antes de que exista la pantalla de login, por lo
 * que se guarda en sessionStorage y la pantalla /login lo muestra una sola vez.
 */
export interface AuthErrorInfo {
  code: string | null;
  title: string;
  detail: string;
}

const STORAGE_KEY = 'andesstay.authError';

const CUENTA_EXTERNA = {
  title: 'La cuenta aún no está registrada en AndesStay',
  detail: 'Para registrar un correo personal se usa «Crear cuenta» y luego la opción «Crear una cuenta» de Microsoft.'
};

/** Códigos AADSTS y de MSAL con un mensaje comprensible; el resto usa el mensaje genérico. */
const KNOWN_ERRORS: Record<string, { title: string; detail: string }> = {
  AADSTS50020: CUENTA_EXTERNA,
  AADSTS90072: CUENTA_EXTERNA,
  AADSTS50105: {
    title: 'La cuenta no tiene acceso a la aplicación',
    detail: 'Un administrador debe asignarle un rol en Azure, o desactivar «Assignment required» en la aplicación empresarial.'
  },
  AADSTS65001: {
    title: 'Falta el consentimiento de la API',
    detail: 'Un administrador debe conceder el consentimiento de AndesStay.Access en Azure (API permissions).'
  },
  AADSTS50011: {
    title: 'La dirección de retorno no está registrada',
    detail: 'La URL de la aplicación debe figurar como Redirect URI de tipo Single-page application en Azure.'
  },
  AADSTS700016: {
    title: 'La aplicación no existe en el directorio',
    detail: 'El client ID configurado no pertenece al tenant de la authority.'
  },
  AADSTS65005: {
    title: 'La API no expone el permiso solicitado',
    detail: 'El scope pedido no coincide con el publicado en «Expose an API».'
  },
  AADSTS500011: {
    title: 'La API no está registrada en el directorio',
    detail: 'Falta el Application ID URI de la aplicación o pertenece a otro tenant.'
  },
  AADSTS9002326: {
    title: 'La aplicación no está registrada como SPA',
    detail: 'La Redirect URI debe estar en la plataforma Single-page application, no en Web.'
  },
  AADSTS50194: {
    title: 'La authority no corresponde a la aplicación',
    detail: 'La aplicación es de un solo tenant: la authority debe incluir el tenant ID.'
  },
  AADSTS53003: {
    title: 'Acceso bloqueado por una política del tenant',
    detail: 'Una política de acceso condicional impidió el inicio de sesión.'
  },
  access_denied: {
    title: 'Se canceló el inicio de sesión',
    detail: 'El proceso se interrumpió antes de terminar. Se puede intentar de nuevo.'
  },
  user_cancelled: {
    title: 'Se canceló el inicio de sesión',
    detail: 'El proceso se interrumpió antes de terminar. Se puede intentar de nuevo.'
  },
  interaction_in_progress: {
    title: 'Ya hay un inicio de sesión en curso',
    detail: 'Se debe esperar a que termine o recargar la página.'
  }
};

export function describeAuthError(error: unknown): AuthErrorInfo {
  const e = (error ?? {}) as { errorCode?: string; errorMessage?: string; message?: string };
  const text = `${e.errorCode ?? ''} ${e.errorMessage ?? e.message ?? ''}`;
  const code = text.match(/AADSTS\d+/)?.[0] || e.errorCode || null;
  const known = code ? KNOWN_ERRORS[code] : undefined;
  return {
    code,
    title: known?.title ?? 'No se pudo iniciar sesión',
    detail: known?.detail
      ?? 'Azure AD devolvió un error inesperado. El detalle queda en la consola del navegador y en Sign-in logs de Entra ID.'
  };
}

export function saveAuthError(error: unknown): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(describeAuthError(error)));
  } catch {
    // Sin sessionStorage (modo privado estricto): el error solo queda en consola.
  }
}

/** Devuelve el último error guardado y lo borra, para mostrarlo una sola vez. */
export function takeAuthError(): AuthErrorInfo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as AuthErrorInfo : null;
  } catch {
    return null;
  }
}
