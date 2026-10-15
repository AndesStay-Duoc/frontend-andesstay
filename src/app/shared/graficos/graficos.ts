/**
 * Datos que reciben los gráficos. Los colores son siempre de la paleta y se asignan por entidad
 * (un estado o un tipo de alojamiento tiene siempre el mismo color), nunca por posición.
 *
 * Combinaciones validadas para daltonismo (ΔE ≥ 11 entre vecinos): petróleo, acero, rojo y vino
 * en ese orden; petróleo, vino y acero; petróleo, acero y rojo. El acero no llega a 3:1 sobre
 * blanco, por eso cada gráfico lleva etiquetas directas, leyenda y vista de tabla.
 */
export interface Segmento {
  etiqueta: string;
  valor: number;
  color: string;
}

export interface Punto {
  /** Texto del eje y del tooltip (p. ej. «14 oct»). */
  etiqueta: string;
  valor: number;
}

export interface SerieApilada {
  nombre: string;
  color: string;
}

export interface CategoriaApilada {
  etiqueta: string;
  /** Un valor por serie, en el mismo orden que las series. */
  valores: number[];
}

export const COLOR = {
  petroleo: 'var(--c-petroleo)',
  vino: 'var(--c-vino)',
  rojo: 'var(--c-rojo)',
  acero: 'var(--c-acero)',
} as const;
