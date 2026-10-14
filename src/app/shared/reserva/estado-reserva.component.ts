import { Component, Input } from '@angular/core';
import { IconoComponent } from '../icono/icono.component';
import { estadoReserva, PASOS_RESERVA } from './estado-reserva';

/** Distintivo del estado de una reserva: color, ícono y texto (nunca solo color). */
@Component({
  selector: 'app-estado-reserva',
  standalone: true,
  imports: [IconoComponent],
  template: `
    <span [class]="'estado estado-' + estado">
      <app-icono [nombre]="meta.icono" [tamano]="17" />{{ meta.etiqueta }}
    </span>
  `,
  styles: [`:host { display: inline-flex; }`]
})
export class EstadoReservaComponent {
  @Input({ required: true }) estado: string | undefined = '';
  get meta() { return estadoReserva(this.estado); }
}

/**
 * Línea de avance de una reserva por el camino feliz. Una cancelada no la muestra: su distintivo
 * ya lo dice y una línea a medias sugeriría que puede retomarse.
 */
@Component({
  selector: 'app-pasos-reserva',
  standalone: true,
  template: `
    @if (estado !== 'CANCELADA') {
      <ol class="pasos" [attr.aria-label]="'Avance de la reserva: ' + (pasoActual + 1) + ' de ' + pasos.length">
        @for (p of pasos; track p.estado; let i = $index) {
          <li [class.hecho]="i < pasoActual" [class.actual]="i === pasoActual"
              [attr.aria-current]="i === pasoActual ? 'step' : null">
            <span class="punto"></span><span class="txt">{{ p.etiqueta }}</span>
          </li>
        }
      </ol>
    }
  `,
  styles: [`
    :host { display: block; }
    .pasos { display: flex; align-items: center; max-width: 560px; list-style: none; }
    li { display: flex; align-items: center; gap: 6px; flex: 1; font-size: 12px; font-weight: 700; color: var(--text-muted); white-space: nowrap; }
    li:last-child { flex: none; }
    li:not(:last-child)::after { content: ''; flex: 1; min-width: 12px; height: 2px; margin: 0 6px; background: var(--border); }
    li.hecho:not(:last-child)::after { background: var(--c-petroleo); }
    .punto { width: 12px; height: 12px; flex-shrink: 0; border-radius: 50%; border: 2px solid var(--border); background: var(--surface); }
    li.hecho .punto { background: var(--c-petroleo); border-color: var(--c-petroleo); }
    li.actual { color: var(--text); }
    li.actual .punto { background: var(--c-acero); border-color: var(--c-petroleo); box-shadow: 0 0 0 3px rgba(102, 155, 188, .35); }
    @media (max-width: 600px) { li:not(.actual) .txt { display: none; } }
  `]
})
export class PasosReservaComponent {
  @Input({ required: true }) estado: string | undefined = '';
  pasos = PASOS_RESERVA;
  get pasoActual(): number {
    const i = this.pasos.findIndex(p => p.estado === this.estado);
    return i < 0 ? 0 : i;
  }
}
