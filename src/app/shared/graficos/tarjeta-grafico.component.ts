import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconoComponent } from '../icono/icono.component';

/**
 * Tarjeta de un gráfico: título, subtítulo con la fuente de los datos, el gráfico o su tabla
 * (<ng-content select="[grafico]"> y select="[tabla]") y «Ver más». La vista de tabla es la
 * alternativa accesible: los mismos datos, sin depender del color.
 */
@Component({
  selector: 'app-tarjeta-grafico',
  standalone: true,
  imports: [RouterLink, IconoComponent],
  template: `
    <article class="tarjeta graf" [attr.aria-labelledby]="idTitulo">
      <h3 [id]="idTitulo">{{ titulo }}</h3>
      <p class="cap">{{ subtitulo }}</p>
      <div class="lienzo">
        @if (vacio) {
          <p class="vacio"><app-icono nombre="insights" [tamano]="28" />{{ textoVacio }}</p>
        } @else if (verTabla) {
          <ng-content select="[tabla]" />
        } @else {
          <ng-content select="[grafico]" />
        }
      </div>
      <div class="pie">
        @if (!vacio) {
          <button type="button" class="btn btn-texto btn-chico" (click)="verTabla = !verTabla" [attr.aria-pressed]="verTabla">
            <app-icono [nombre]="verTabla ? 'insert_chart' : 'table'" [tamano]="18" />{{ verTabla ? 'Ver gráfico' : 'Ver tabla' }}
          </button>
        } @else { <span></span> }
        @if (enlace) { <a class="btn btn-secundario btn-chico" [routerLink]="enlace">Ver más</a> }
      </div>
    </article>
  `,
  styles: [`
    :host { display: block; scroll-margin-top: 80px; }
    .graf { height: 100%; display: flex; flex-direction: column; gap: 2px; padding: 18px; }
    h3 { font-family: var(--font-body); font-size: 17px; font-weight: 800; }
    .cap { font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--text-muted); }
    .lienzo { flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 230px; padding: 14px 0 6px; }
    .vacio { display: grid; justify-items: center; gap: 8px; text-align: center; color: var(--text-muted); }
    .pie { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-top: 10px; border-top: 1px solid var(--border); }
    :host ::ng-deep table { width: 100%; border-collapse: collapse; font-size: 14px; }
    :host ::ng-deep th, :host ::ng-deep td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border); }
    :host ::ng-deep th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
    :host ::ng-deep td.num, :host ::ng-deep th.num { text-align: right; font-variant-numeric: tabular-nums; }
  `]
})
export class TarjetaGraficoComponent {
  private static siguiente = 0;
  readonly idTitulo = 'graf-' + (TarjetaGraficoComponent.siguiente++);

  @Input({ required: true }) titulo = '';
  @Input() subtitulo = '';
  @Input() enlace = '';
  @Input() vacio = false;
  @Input() textoVacio = 'Aún no hay datos para este gráfico.';

  verTabla = false;
}
