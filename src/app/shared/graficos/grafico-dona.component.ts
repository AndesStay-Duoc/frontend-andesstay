import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Segmento } from './graficos';

/**
 * Dona o torta (con `torta`) en SVG, sin librería. Cada segmento lleva 2 px de separación y la
 * leyenda muestra el valor de cada uno, así que la identidad nunca depende solo del color. Al
 * pasar el cursor (o con el foco) por un segmento o su fila de leyenda, se destacan los dos y la
 * dona muestra su valor en el centro.
 */
@Component({
  selector: 'app-grafico-dona',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="dona">
      <svg viewBox="0 0 200 200" role="img" [attr.aria-label]="descripcion">
        <g transform="translate(100 100) rotate(-90)" fill="none" [attr.stroke-width]="torta ? 100 : 34">
          @for (a of arcos; track a.etiqueta; let i = $index) {
            <circle [attr.r]="radio" [style.stroke]="a.color" [attr.stroke-dasharray]="a.trazo + ' ' + circunferencia"
                    [attr.stroke-dashoffset]="-a.inicio" [class.atenuado]="activo !== null && activo !== i"
                    (mouseenter)="activo = i" (mouseleave)="activo = null" />
          }
        </g>
        @if (!torta) {
          <text x="100" y="98" text-anchor="middle" class="centro-valor">{{ activo !== null ? arcos[activo].valor : total }}</text>
          <text x="100" y="120" text-anchor="middle" class="centro-txt">{{ activo !== null ? arcos[activo].etiqueta : textoCentro }}</text>
        }
      </svg>
      <ul class="leyenda">
        @for (a of arcos; track a.etiqueta; let i = $index) {
          <li tabindex="0" [class.activo]="activo === i" (mouseenter)="activo = i" (mouseleave)="activo = null"
              (focus)="activo = i" (blur)="activo = null">
            <i [style.background]="a.color"></i>
            <span>{{ a.etiqueta }}</span>
            <b>{{ a.valor }}</b>
            <small>{{ a.porcentaje | number:'1.0-0' }} %</small>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [`
    .dona { display: grid; grid-template-columns: minmax(140px, 190px) 1fr; gap: 20px; align-items: center; }
    svg { width: 100%; height: auto; overflow: visible; }
    circle { transition: opacity .15s; }
    circle.atenuado { opacity: .35; }
    .centro-valor { font-size: 32px; font-weight: 700; fill: var(--c-petroleo); font-family: var(--font-body); }
    .centro-txt { font-size: 12px; fill: var(--c-texto-2); font-family: var(--font-body); }
    .leyenda { display: grid; gap: 4px; list-style: none; }
    li { display: grid; grid-template-columns: 12px 1fr auto auto; gap: 8px; align-items: center; padding: 6px 8px;
      border-radius: var(--radius-sm); font-size: 14px; outline: none; }
    li.activo, li:focus-visible { background: var(--surface-sutil); box-shadow: none; }
    li i { width: 12px; height: 12px; border-radius: 3px; }
    li b { font-weight: 700; }
    li small { min-width: 40px; text-align: right; color: var(--text-muted); }
    @media (max-width: 480px) { .dona { grid-template-columns: 1fr; } svg { max-width: 190px; margin: 0 auto; } }
  `]
})
export class GraficoDonaComponent {
  @Input({ required: true }) segmentos: Segmento[] = [];
  /** Torta llena en vez de dona. */
  @Input() torta = false;
  @Input() textoCentro = 'total';
  @Input() descripcion = '';

  activo: number | null = null;

  // Torta: trazo de 100 sobre radio 50 cubre del centro al borde (100) sin salirse.
  get radio(): number { return this.torta ? 50 : 80; }
  get circunferencia(): number { return 2 * Math.PI * this.radio; }
  get total(): number { return this.segmentos.reduce((s, x) => s + x.valor, 0); }

  /** Arcos con 2 px de separación entre segmentos (si hay más de uno con valor). */
  get arcos() {
    const total = this.total || 1;
    const conValor = this.segmentos.filter(s => s.valor > 0).length;
    const separacion = conValor > 1 ? 2 : 0;
    let inicio = 0;
    return this.segmentos.map(s => {
      const largo = (s.valor / total) * this.circunferencia;
      const arco = { ...s, inicio, trazo: Math.max(largo - separacion, 0), porcentaje: (s.valor / total) * 100 };
      inicio += largo;
      return arco;
    });
  }
}
