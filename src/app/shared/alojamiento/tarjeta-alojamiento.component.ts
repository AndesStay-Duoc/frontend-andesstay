import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Unit } from '../../services/catalog.service';
import { IconoComponent } from '../icono/icono.component';
import { FotoAlojamientoComponent } from './foto-alojamiento.component';
import { tipoAlojamiento } from './alojamiento-meta';

/**
 * Tarjeta de un alojamiento: foto grande, tipo, nombre, establecimiento, capacidad, precio por
 * noche, cupo y «Reservar». La usan la portada del Cliente y el catálogo.
 *
 * Solo presenta. Reservar emite el evento y quien la usa decide qué hacer (hoy, navegar al
 * formulario de reservas con la unidad elegida). Las acciones del Admin entran por
 * <ng-content select="[acciones]">.
 */
@Component({
  selector: 'app-tarjeta-alojamiento',
  standalone: true,
  imports: [CurrencyPipe, IconoComponent, FotoAlojamientoComponent],
  template: `
    <article class="tarjeta aloj" [class.sin-cupo]="sinCupo">
      <div class="foto">
        <app-foto-alojamiento [unidad]="unidad" />
        <span class="tipo"><app-icono [nombre]="tipo.icono" [tamano]="16" />{{ tipo.etiqueta }}</span>
      </div>
      <div class="cuerpo">
        <h3>{{ unidad.name }}</h3>
        <span class="lugar"><app-icono nombre="location_on" [tamano]="18" />{{ nombreHostal }}</span>
        @if (detallada && unidad.description) {
          <p class="desc">{{ unidad.description }}</p>
        }
        <div class="meta">
          <span><app-icono nombre="group" [tamano]="18" />Hasta {{ unidad.capacity }} {{ unidad.capacity === 1 ? 'persona' : 'personas' }}</span>
          @if (sinCupo) {
            <span class="dispo no"><app-icono nombre="block" [tamano]="18" />Sin cupo</span>
          } @else {
            <span class="dispo"><app-icono nombre="check_circle" [tamano]="18" />
              {{ detallada ? unidad.availableSlots + (unidad.availableSlots === 1 ? ' cupo' : ' cupos') : 'Con cupo' }}
            </span>
          }
        </div>
        <div class="pie">
          <span class="precio"><strong>{{ unidad.pricePerNight | currency:'CLP':'symbol-narrow':'1.0-0' }}</strong> <small>/ noche</small></span>
          @if (puedeReservar) {
            <button type="button" class="btn btn-primario btn-chico" [disabled]="sinCupo"
                    [attr.title]="sinCupo ? 'Sin cupos disponibles' : null" (click)="reservar.emit(unidad)">
              {{ sinCupo ? 'Sin cupo' : 'Reservar' }}
            </button>
          }
        </div>
      </div>
      <ng-content select="[acciones]" />
    </article>
  `,
  styles: [`
    :host { display: block; }
    .aloj { height: 100%; overflow: hidden; display: flex; flex-direction: column; transition: transform .15s, box-shadow .15s; }
    .aloj:hover { transform: translateY(-3px); box-shadow: var(--shadow-2); }
    .foto { position: relative; }
    .sin-cupo app-foto-alojamiento { filter: grayscale(.5); }
    .tipo { position: absolute; top: 12px; left: 12px; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
      border-radius: 999px; background: var(--c-crema); color: var(--c-petroleo); font-size: 12px; font-weight: 700; }
    .cuerpo { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 16px; }
    h3 { font-size: 20px; }
    .lugar, .meta span { display: inline-flex; align-items: center; gap: 4px; }
    .lugar { font-size: 14px; color: var(--text-muted); }
    .desc { font-size: 14px; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .meta { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 14px; color: var(--text-muted); }
    .dispo { font-weight: 700; color: var(--c-petroleo); }
    .dispo.no { color: var(--danger); }
    .pie { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border); }
    .precio { white-space: nowrap; }
    .precio strong { font-size: 20px; font-weight: 700; }
    .precio small { color: var(--text-muted); }
  `]
})
export class TarjetaAlojamientoComponent {
  @Input({ required: true }) unidad!: Unit;
  @Input() nombreHostal = '';
  @Input() puedeReservar = true;
  /** Con descripción y número de cupos (catálogo). Sin ellos, más compacta (portada). */
  @Input() detallada = false;
  @Output() reservar = new EventEmitter<Unit>();

  get tipo() { return tipoAlojamiento(this.unidad.type); }
  get sinCupo(): boolean { return this.unidad.availableSlots === 0; }
}
