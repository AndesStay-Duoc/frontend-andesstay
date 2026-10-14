import { Component, Input } from '@angular/core';
import { CategoriaApilada, SerieApilada } from './graficos';

const ALTO = 200;
const BASE = 176;
const TECHO = 22;

/**
 * Barras apiladas en SVG, sin librería: 2 px de separación entre segmentos, el total escrito sobre
 * cada barra, leyenda siempre visible y tooltip por segmento al pasar el cursor.
 */
@Component({
  selector: 'app-grafico-barras',
  standalone: true,
  template: `
    <div class="barras" (mouseleave)="activo = null">
      <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" role="img" [attr.aria-label]="descripcion">
        <line class="base" x1="0" [attr.x2]="ancho" [attr.y1]="base" [attr.y2]="base" />
        @for (c of barras; track c.etiqueta; let ci = $index) {
          @for (s of c.segmentos; track s; let si = $index) {
            @if (s.alto > 0) {
              <rect [attr.x]="c.x" [attr.y]="s.y" [attr.width]="anchoBarra" [attr.height]="s.alto" [attr.rx]="s.tope ? 3 : 0"
                    [style.fill]="series[si].color" [class.atenuado]="activo && (activo.c !== ci || activo.s !== si)"
                    (mouseenter)="activo = { c: ci, s: si }" />
            }
          }
          <text class="total" [attr.x]="c.x + anchoBarra / 2" [attr.y]="c.yTotal - 6" text-anchor="middle">{{ c.total }}</text>
          <text class="eje" [attr.x]="c.x + anchoBarra / 2" [attr.y]="alto - 4" text-anchor="middle">{{ c.etiqueta }}</text>
        }
      </svg>
      @if (activo) {
        <div class="tip" [style.left.%]="((barras[activo.c].x + anchoBarra / 2) / ancho) * 100">
          {{ barras[activo.c].etiqueta }} · {{ series[activo.s].nombre }}: <b>{{ categorias[activo.c].valores[activo.s] }}</b>
        </div>
      }
      <ul class="leyenda">
        @for (s of series; track s.nombre) { <li><i [style.background]="s.color"></i>{{ s.nombre }}</li> }
      </ul>
    </div>
  `,
  styles: [`
    .barras { position: relative; }
    svg { display: block; width: 100%; height: auto; max-height: 240px; overflow: visible; }
    .base { stroke: #c9bca4; stroke-width: 1; }
    rect { transition: opacity .15s; }
    rect.atenuado { opacity: .4; }
    .total { font-size: 12px; font-weight: 800; fill: var(--c-petroleo); font-family: var(--font-body); }
    .eje { font-size: 11px; fill: var(--c-texto-2); font-family: var(--font-body); }
    .tip { position: absolute; top: 0; transform: translateX(-50%); padding: 5px 10px; border-radius: 8px; white-space: nowrap;
      pointer-events: none; background: var(--c-petroleo); color: var(--c-crema); font-size: 13px; box-shadow: var(--shadow-2); }
    .leyenda { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 10px; list-style: none; font-size: 13px; font-weight: 700; }
    .leyenda li { display: inline-flex; align-items: center; gap: 6px; }
    .leyenda i { width: 12px; height: 12px; border-radius: 3px; }
  `]
})
export class GraficoBarrasComponent {
  @Input({ required: true }) series: SerieApilada[] = [];
  @Input({ required: true }) categorias: CategoriaApilada[] = [];
  @Input() descripcion = '';

  readonly alto = ALTO;
  readonly base = BASE;
  activo: { c: number; s: number } | null = null;

  get ancho(): number { return Math.max(320, this.categorias.length * 64); }
  get anchoBarra(): number { return 30; }

  get barras() {
    const banda = this.ancho / Math.max(this.categorias.length, 1);
    const max = Math.max(1, ...this.categorias.map(c => c.valores.reduce((a, b) => a + b, 0)));
    const escala = (BASE - TECHO) / max;
    return this.categorias.map((c, i) => {
      const x = i * banda + (banda - this.anchoBarra) / 2;
      let y = BASE;
      let hayAbajo = false;
      const ultimo = c.valores.map((v, k) => v > 0 ? k : -1).reduce((a, b) => Math.max(a, b), -1);
      const segmentos = c.valores.map((v, k) => {
        if (v <= 0) return { y, alto: 0, tope: false };
        // La separación de 2 px con el segmento de abajo sale de la altura de este, no se suma.
        const separacion = hayAbajo ? 2 : 0;
        const alto = Math.max(v * escala - separacion, 1);
        y -= separacion + alto;
        hayAbajo = true;
        return { y, alto, tope: k === ultimo };
      });
      return { etiqueta: c.etiqueta, x, segmentos, total: c.valores.reduce((a, b) => a + b, 0), yTotal: y };
    });
  }
}
