/**
 * Presentación de los estados REALES de ReservationStatus (backend). Sin tilde en EN_ESTADIA,
 * igual que el enum. Orden y transiciones: infra/docs/contracts/estados.md.
 *
 *   CREADA → CONFIRMADA → CHECKIN_PENDIENTE → EN_ESTADIA → CHECKOUT
 *   CANCELADA desde CREADA, CONFIRMADA o CHECKIN_PENDIENTE
 */
export const ESTADOS_RESERVA = ['CREADA', 'CONFIRMADA', 'CHECKIN_PENDIENTE', 'EN_ESTADIA', 'CHECKOUT', 'CANCELADA'] as const;

const META: Record<string, { etiqueta: string; icono: string }> = {
  CREADA:            { etiqueta: 'Por confirmar',      icono: 'schedule' },
  CONFIRMADA:        { etiqueta: 'Confirmada',         icono: 'check_circle' },
  CHECKIN_PENDIENTE: { etiqueta: 'Check-in pendiente', icono: 'key' },
  EN_ESTADIA:        { etiqueta: 'En estadía',         icono: 'cottage' },
  CHECKOUT:          { etiqueta: 'Finalizada',         icono: 'done_all' },
  CANCELADA:         { etiqueta: 'Cancelada',          icono: 'cancel' },
};

export function estadoReserva(estado: string | undefined | null): { etiqueta: string; icono: string } {
  return META[estado ?? ''] ?? { etiqueta: estado || 'Sin estado', icono: 'help' };
}

/** Pasos del camino feliz, para la línea de avance. CANCELADA no es un paso: corta el camino. */
export const PASOS_RESERVA = [
  { estado: 'CREADA',            etiqueta: 'Creada' },
  { estado: 'CONFIRMADA',        etiqueta: 'Confirmada' },
  { estado: 'CHECKIN_PENDIENTE', etiqueta: 'Check-in' },
  { estado: 'EN_ESTADIA',        etiqueta: 'En estadía' },
  { estado: 'CHECKOUT',          etiqueta: 'Salida' },
];
