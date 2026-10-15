import { Component, Input, OnChanges } from '@angular/core';
import { Unit } from '../../services/catalog.service';
import { IconoComponent } from '../icono/icono.component';
import { fotosDe, tipoAlojamiento } from './alojamiento-meta';

/**
 * Foto 3:2 de un alojamiento. Prueba la foto de la unidad y luego la de su tipo; mientras carga, o
 * si ninguna existe, se ve un marcador del tipo con los colores de la paleta. La imagen solo se
 * muestra cuando terminó de cargar, así que nunca aparece el ícono de imagen rota.
 */
@Component({
  selector: 'app-foto-alojamiento',
  standalone: true,
  imports: [IconoComponent],
  template: `
    <div class="marcador" [attr.data-tipo]="tipo" aria-hidden="true">
      <app-icono [nombre]="icono" [tamano]="44" />
    </div>
    @if (src) {
      <img [src]="src" [alt]="alt" loading="lazy" [class.lista]="cargada"
           (load)="cargada = true" (error)="siguiente()" />
    }
  `,
  styles: [`
    :host { position: relative; display: block; aspect-ratio: 3 / 2; overflow: hidden; background: var(--c-petroleo); }
    .marcador { position: absolute; inset: 0; display: grid; place-items: center; color: rgba(253, 240, 213, .55);
      background: linear-gradient(160deg, #0b4361 0%, var(--c-petroleo) 100%); }
    .marcador[data-tipo='HABITACION'] { background: linear-gradient(160deg, #8f1a1a 0%, var(--c-vino) 100%); }
    .marcador[data-tipo='LODGE'] { background: linear-gradient(160deg, #4f7f9c 0%, #2f5f7a 100%); }
    img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .3s; }
    img.lista { opacity: 1; }
  `]
})
export class FotoAlojamientoComponent implements OnChanges {
  @Input({ required: true }) unidad!: Pick<Unit, 'name' | 'type'>;

  src: string | null = null;
  cargada = false;
  tipo = '';
  icono = 'home';
  alt = '';
  private pendientes: string[] = [];

  ngOnChanges() {
    this.tipo = (this.unidad.type ?? '').toUpperCase();
    this.icono = tipoAlojamiento(this.unidad.type).icono;
    this.alt = 'Foto de ' + this.unidad.name;
    this.pendientes = fotosDe(this.unidad);
    this.cargada = false;
    this.src = this.pendientes.shift() ?? null;
  }

  siguiente() {
    this.cargada = false;
    this.src = this.pendientes.shift() ?? null;
  }
}
