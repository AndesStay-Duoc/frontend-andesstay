/** Roles de la aplicacion, tal como llegan en el claim `roles` del token. */
export type Rol = 'Admin' | 'Recepcionista' | 'Auditor' | 'Huesped';

export const ROLES_PERSONAL: Rol[] = ['Admin', 'Recepcionista', 'Auditor'];
export const ROLES_HUESPED: Rol[] = ['Huesped'];

/** Identidad derivada del token. Nada de esto esta escrito en el codigo. */
export interface Identidad {
  sub: string;
  nombre: string;
  roles: Rol[];
  scopes: string[];
  issuer: string;
  audience: string[];
  expira: Date;
}

/** Decodifica el payload de un JWT sin verificar la firma. */
export function leerClaims(token: string): Record<string, unknown> {
  const partes = token.split('.');
  if (partes.length < 2) {
    throw new Error('El token no tiene el formato de un JWT');
  }
  const payload = partes[1].replace(/-/g, '+').replace(/_/g, '/');
  const relleno = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(decodeURIComponent(escape(atob(relleno))));
}

/**
 * Construye la identidad leyendo los claims del token.
 *
 * Los roles y scopes se toman del token, nunca de una lista en el codigo: es lo que exige el
 * indicador 1 de la EP1 para el nivel maximo.
 */
export function identidadDesdeToken(token: string): Identidad {
  const c = leerClaims(token);
  const roles = Array.isArray(c['roles']) ? (c['roles'] as string[]) : [];
  const scopeCrudo = (c['scp'] ?? c['scope'] ?? '') as string;

  return {
    sub: (c['sub'] as string) ?? '',
    nombre: (c['name'] as string) ?? (c['preferred_username'] as string) ?? (c['sub'] as string) ?? '',
    roles: roles as Rol[],
    scopes: scopeCrudo ? scopeCrudo.split(' ').filter(Boolean) : [],
    issuer: (c['iss'] as string) ?? '',
    audience: Array.isArray(c['aud']) ? (c['aud'] as string[]) : [c['aud'] as string].filter(Boolean),
    expira: new Date(((c['exp'] as number) ?? 0) * 1000),
  };
}
