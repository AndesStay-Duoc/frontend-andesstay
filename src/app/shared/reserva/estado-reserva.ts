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

/** Un cambio de estado que el personal puede pedir desde la lista. */
export interface PasoSiguiente {
  hacia: string;
  etiqueta: string;
  /** Cancelar es irreversible: se pide confirmación y se pinta como acción de peligro. */
  peligro: boolean;
}

/**
 * Siguientes pasos válidos desde cada estado, copiados de ReservationStatus.canTransitionTo()
 * del backend. Antes la lista ofrecía los 6 estados en un desplegable y la mayoría terminaba en
 * 409 TRANSICION_INVALIDA. El backend sigue siendo quien valida: esto solo evita ofrecer lo que
 * de todos modos rechazaría.
 */
const TRANSICIONES: Record<string, PasoSiguiente[]> = {
  CREADA: [
    { hacia: 'CONFIRMADA', etiqueta: 'Confirmar', peligro: false },
    { hacia: 'CANCELADA', etiqueta: 'Cancelar', peligro: true },
  ],
  CONFIRMADA: [
    { hacia: 'CHECKIN_PENDIENTE', etiqueta: 'Preparar check-in', peligro: false },
    { hacia: 'CANCELADA', etiqueta: 'Cancelar', peligro: true },
  ],
  CHECKIN_PENDIENTE: [
    { hacia: 'EN_ESTADIA', etiqueta: 'Registrar llegada', peligro: false },
    { hacia: 'CANCELADA', etiqueta: 'Cancelar', peligro: true },
  ],
  EN_ESTADIA: [
    { hacia: 'CHECKOUT', etiqueta: 'Registrar salida', peligro: false },
  ],
};

export function pasosSiguientes(estado: string | undefined | null): PasoSiguiente[] {
  return TRANSICIONES[estado ?? ''] ?? [];
}
