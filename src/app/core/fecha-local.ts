/**
 * Fecha en formato ISO (yyyy-MM-dd) según el reloj LOCAL del navegador.
 *
 * No se usa `toISOString()`: esa función convierte primero a UTC, y en Chile (UTC-3 en verano,
 * UTC-4 en invierno) desde las 21:00 o las 20:00 ya devuelve el día siguiente. Así, «Llegadas
 * de hoy» consultaba las de mañana y el formulario de reserva proponía fechas corridas en un día.
 */
export function fechaLocalIso(fecha: Date): string {
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** La fecha de hoy desplazada `dias` días, en el reloj local. */
export function diasDesdeHoy(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}
