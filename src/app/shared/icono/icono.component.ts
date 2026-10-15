import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Ícono de Material Symbols Rounded, la única librería de íconos de la app (reemplaza a los emojis).
 *
 * Se usa mat-icon de Angular Material, que ya estaba en las dependencias, con la fuente por
 * ligaduras que carga index.html: el nombre del ícono es el texto («home», «event_available»…).
 *
 * Por omisión es decorativo (aria-hidden). Si el ícono va solo, sin texto que lo acompañe, hay
 * que darle `etiqueta` para que el lector de pantalla diga algo.
 */
@Component({
  selector: 'app-icono',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <mat-icon fontSet="material-symbols-rounded"
              [class.relleno]="relleno"
              [attr.aria-hidden]="etiqueta ? 'false' : 'true'"
              [attr.aria-label]="etiqueta || null"
              [style.font-size.px]="tamano"
              [style.width.px]="tamano"
              [style.height.px]="tamano">{{ nombre }}</mat-icon>
  `,
  styles: [`
    :host { display: inline-flex; flex-shrink: 0; line-height: 0; }
    mat-icon { line-height: 1; overflow: visible; }
  `]
})
export class IconoComponent {
  /** Nombre del símbolo, p. ej. «home». Catálogo: fonts.google.com/icons */
  @Input({ required: true }) nombre!: string;
  /** Variante rellena, para el elemento activo de un menú. */
  @Input() relleno = false;
  /** Tamaño en píxeles. */
  @Input() tamano = 20;
  /** Texto para lectores de pantalla cuando el ícono va sin texto visible. */
  @Input() etiqueta = '';
}
