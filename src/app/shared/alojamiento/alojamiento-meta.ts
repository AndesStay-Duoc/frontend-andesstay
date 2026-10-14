import { Unit } from '../../services/catalog.service';

/** Presentación de cada valor del enum UnitType del backend. */
const TIPOS: Record<string, { etiqueta: string; icono: string }> = {
  CABANA:     { etiqueta: 'Cabaña',     icono: 'cottage' },
  HABITACION: { etiqueta: 'Habitación', icono: 'bed' },
  LODGE:      { etiqueta: 'Lodge',      icono: 'villa' },
};

export function tipoAlojamiento(tipo: string | undefined): { etiqueta: string; icono: string } {
  return TIPOS[(tipo ?? '').toUpperCase()] ?? { etiqueta: tipo || 'Alojamiento', icono: 'home' };
}

/** «Cabaña Coigüe» → «cabana-coigue»: sin tildes, en minúsculas y con guiones. */
export function slugDe(nombre: string): string {
  return nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Fotos a intentar, en orden: la específica de la unidad (por su nombre) y la de respaldo de su
 * tipo. Las unidades las crea el Admin, así que una nueva o renombrada cae a la de su tipo; si
 * tampoco existe, FotoAlojamientoComponent muestra un marcador con los colores de la paleta.
 */
export function fotosDe(unidad: Pick<Unit, 'name' | 'type'>): string[] {
  const rutas: string[] = [];
  if (unidad.name) rutas.push(`assets/img/alojamientos/${slugDe(unidad.name)}.jpg`);
  if (unidad.type) rutas.push(`assets/img/alojamientos/tipos/tipo-${unidad.type.toLowerCase()}.jpg`);
  return rutas;
}
