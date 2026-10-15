import { Component, Input } from '@angular/core';
import { Punto } from './graficos';

const ANCHO = 440;
const ALTO = 200;
const MARGEN = { izq: 32, der: 8, arriba: 16, abajo: 26 };

/**
 * Área de una sola serie en SVG, sin librería. Línea de 2 px sobre un relleno suave, eje Y desde
 * cero con tres marcas, y una guía vertical con tooltip al pasar el cursor por cualquier punto.
 * El máximo lleva su valor escrito, para que la cifra principal se lea sin interactuar.
 */
@Component({
  selector: 'app-grafico-area',
  standalone: true,
  template: `
    <div class="area" (mouseleave)="activo = null">
      <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" role="img" [attr.aria-label]="descripcion">
        @for (m of marcas; track m.valor) {
          <line class="guia" [attr.x1]="m0.izq" [attr.x2]="ancho - m0.der" [attr.y1]="m.y" [attr.y2]="m.y" />
          <text class="eje" [attr.x]="m0.izq - 6" [attr.y]="m.y + 4" text-anchor="end">{{ m.valor }}</text>
        }
        <path [attr.d]="rutaArea" class="relleno" />
        <path [attr.d]="rutaLinea" class="linea" />
        @if (maximo; as mx) {
          <circle [attr.cx]="mx.x" [attr.cy]="mx.y" r="5" class="punto" />
          <text [attr.x]="mx.x" [attr.y]="mx.y - 10" text-anchor="middle" class="valor">{{ mx.valor }}</text>
        }
        @if (activo !== null) {
          <line class="cruz" [attr.x1]="xs[activo]" [attr.x2]="xs[activo]" [attr.y1]="m0.arriba" [attr.y2]="alto - m0.abajo" />
          <circle [attr.cx]="xs[activo]" [attr.cy]="ys[activo]" r="5" class="punto" />
        }
        @for (e of etiquetasX; track e.i) {
          <text class="eje" [attr.x]="xs[e.i]" [attr.y]="alto - 6" [attr.text-anchor]="e.ancla">{{ puntos[e.i].etiqueta }}</text>
        }
        <!-- Zonas de contacto más anchas que la marca: una por punto -->
        @for (p of puntos; track p.etiqueta; let i = $index) {
          <rect [attr.x]="xs[i] - paso / 2" [attr.y]="0" [attr.width]="paso" [attr.height]="alto" fill="transparent"
                (mouseenter)="activo = i" />
        }
      </svg>
      @if (activo !== null) {
        <div class="tip" [style.left.%]="(xs[activo] / ancho) * 100">
          <b>{{ puntos[activo].valor }}</b> {{ unidad }} · {{ puntos[activo].etiqueta }}
        </div>
      }
    </div>
  `,
  styles: [`
    .area { position: relative; }
    svg { display: block; width: 100%; height: auto; overflow: visible; }
    .guia { stroke: var(--c-linea); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .eje { font-size: 11px; fill: var(--c-texto-2); font-family: var(--font-body); }
    .relleno { fill: var(--c-acero); fill-opacity: .28; }
    .linea { fill: none; stroke: var(--c-petroleo); stroke-width: 2; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
    .punto { fill: var(--c-petroleo); stroke: var(--c-blanco); stroke-width: 2; }
    .valor { font-size: 12px; font-weight: 700; fill: var(--c-petroleo); font-family: var(--font-body); }
    .cruz { stroke: var(--c-petroleo); stroke-width: 1; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
    .tip { position: absolute; top: 0; transform: translateX(-50%); padding: 5px 10px; border-radius: 8px; white-space: nowrap;
      pointer-events: none; background: var(--c-petroleo); color: var(--c-crema); font-size: 13px; box-shadow: var(--shadow-2); }
  `]
})
export class GraficoAreaComponent {
  @Input({ required: true }) puntos: Punto[] = [];
  @Input() unidad = '';
  @Input() descripcion = '';

  readonly ancho = ANCHO;
  readonly alto = ALTO;
  readonly m0 = MARGEN;
  activo: number | null = null;

  /** Tope del eje: el máximo redondeado hacia arriba a un número par (mínimo 2). */
  get tope(): number {
    const max = Math.max(0, ...this.puntos.map(p => p.valor));
    return Math.max(2, Math.ceil(max / 2) * 2);
  }

  get paso(): number {
    return (ANCHO - MARGEN.izq - MARGEN.der) / Math.max(this.puntos.length - 1, 1);
  }

  get xs(): number[] {
    return this.puntos.map((_, i) => MARGEN.izq + i * this.paso);
  }

  get ys(): number[] {
    const h = ALTO - MARGEN.arriba - MARGEN.abajo;
    return this.puntos.map(p => MARGEN.arriba + h - (p.valor / this.tope) * h);
  }

  get marcas() {
    const h = ALTO - MARGEN.arriba - MARGEN.abajo;
    return [0, this.tope / 2, this.tope].map(v => ({ valor: v, y: MARGEN.arriba + h - (v / this.tope) * h }));
  }

  get rutaLinea(): string {
    return this.xs.map((x, i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + this.ys[i].toFixed(1)).join(' ');
  }

  get rutaArea(): string {
    if (!this.puntos.length) return '';
    const base = ALTO - MARGEN.abajo;
    return this.rutaLinea + ` L${this.xs[this.xs.length - 1].toFixed(1)} ${base} L${this.xs[0].toFixed(1)} ${base} Z`;
  }

  /** El punto más alto, para escribir su valor. */
  get maximo(): { x: number; y: number; valor: number } | null {
    let mejor = -1;
    this.puntos.forEach((p, i) => { if (p.valor > 0 && (mejor < 0 || p.valor > this.puntos[mejor].valor)) mejor = i; });
    return mejor < 0 ? null : { x: this.xs[mejor], y: this.ys[mejor], valor: this.puntos[mejor].valor };
  }

  /** Primera, del medio y última etiqueta del eje X. */
  get etiquetasX() {
    const n = this.puntos.length;
    if (!n) return [];
    const medio = Math.floor((n - 1) / 2);
    return [{ i: 0, ancla: 'start' }, { i: medio, ancla: 'middle' }, { i: n - 1, ancla: 'end' }]
      .filter((e, k, arr) => arr.findIndex(x => x.i === e.i) === k);
  }
}
