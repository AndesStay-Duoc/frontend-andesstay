import { HttpErrorResponse } from '@angular/common/http';

/**
 * Traduce un error HTTP a un mensaje que explica la causa probable.
 *
 * Vive aqui y no en un componente porque las pantallas de catalogo, reporteria y auditoria
 * necesitan exactamente la misma explicacion, y el texto de 401 y 403 es la evidencia que pide
 * el indicador 8 de la EP2: hay que mostrarlo igual en todas.
 */
export function explicarError(e: HttpErrorResponse): string {
  const codigo = (e.error as { error?: string })?.error ?? '';
  switch (e.status) {
    case 0:
      return 'No hubo respuesta. ¿Está el BFF corriendo y con CORS habilitado para este origen?';
    case 401:
      return `401 ${codigo}: el token falta, expiró, tiene firma inválida, audience incorrecta o viene de un emisor desconocido.`;
    case 403:
      return `403 ${codigo}: el token es válido pero el rol no alcanza para esta operación.`;
    case 404:
      return `404 ${codigo}: la ruta no existe en el gateway o el recurso no está.`;
    default:
      return `${e.status}: ${e.message}`;
  }
}
