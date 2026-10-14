import { Component, Input } from '@angular/core';

/**
 * Región decorativa del fondo propio (assets/img/fondo-andesstay.png, 2400×4267).
 *
 * La imagen es un mosaico con celdas vacías, así que nunca se usa entera: se encuadra una región
 * con el viewBox de un SVG y preserveAspectRatio «slice», que la hace cubrir el contenedor sea
 * cual sea su proporción, sin deformarla. Un background-position no lo consigue: según el ancho
 * dejaba ver celdas vacías o bordes.
 *
 * Ocupa todo su contenedor (que debe tener position: relative) y es solo decoración: nunca va
 * detrás de texto pequeño ni de formularios.
 */
const REGIONES = {
  /** Formas orgánicas vino, rojo, crema y petróleo (bloque superior). */
  organico: '600 0 1800 1826',
  /** Bloque vino con elipses (abajo a la derecha). */
  elipses: '1200 2440 1200 1827',
} as const;

export type RegionFondo = keyof typeof REGIONES;

@Component({
  selector: 'app-fondo',
  standalone: true,
  template: `
    <svg [attr.viewBox]="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <image href="assets/img/fondo-andesstay.png" width="2400" height="4267" />
    </svg>
  `,
  styles: [`
    :host { position: absolute; inset: 0; display: block; overflow: hidden; background: var(--c-vino); }
    svg { display: block; width: 100%; height: 100%; }
  `]
})
export class FondoComponent {
  @Input() region: RegionFondo = 'organico';

  get viewBox(): string {
    return REGIONES[this.region];
  }
}
