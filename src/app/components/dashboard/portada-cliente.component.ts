import { Component, Input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Reservation } from '../../services/reservation.service';
import { Hostal, Unit } from '../../services/catalog.service';
import { diasDesdeHoy, fechaLocalIso } from '../../core/fecha-local';
import { IconoComponent } from '../../shared/icono/icono.component';
import { FondoComponent } from '../../shared/fondo/fondo.component';
import { FotoAlojamientoComponent } from '../../shared/alojamiento/foto-alojamiento.component';
import { TarjetaAlojamientoComponent } from '../../shared/alojamiento/tarjeta-alojamiento.component';
import { EstadoReservaComponent, PasosReservaComponent } from '../../shared/reserva/estado-reserva.component';

/**
 * Portada del Cliente: «encuentra tu próxima estadía». Reemplaza al panel solo para ese rol; la
 * ruta sigue siendo /dashboard. Recibe los datos que DashboardComponent ya descarga y no hace
 * llamadas propias: buscar y reservar solo navegan.
 */
@Component({
  selector: 'app-portada-cliente',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, IconoComponent, FondoComponent,
    FotoAlojamientoComponent, TarjetaAlojamientoComponent, EstadoReservaComponent, PasosReservaComponent],
  template: `
    <section class="hero">
      <div class="hero-texto">
        @if (nombre) { <span class="hola">Hola, {{ nombre }}</span> }
        <h1>Encuentra tu próxima estadía en el sur</h1>
        <p>Elige fechas y número de personas: te mostramos solo los alojamientos libres todas las noches de tu viaje.</p>

        <form class="buscador" (ngSubmit)="buscar()" novalidate>
          <div class="campo">
            <label for="b-llegada">Llegada</label>
            <div class="control"><input id="b-llegada" type="date" name="desde" [(ngModel)]="desde" [min]="hoy" /></div>
          </div>
          <div class="campo">
            <label for="b-salida">Salida</label>
            <div class="control"><input id="b-salida" type="date" name="hasta" [(ngModel)]="hasta" [min]="desde || hoy" /></div>
          </div>
          <div class="campo">
            <label for="b-huespedes">Huéspedes</label>
            <div class="control"><app-icono nombre="group" /><input id="b-huespedes" type="number" min="1" name="huespedes" [(ngModel)]="huespedes" /></div>
          </div>
          <button type="submit" class="btn btn-primario"><app-icono nombre="search" />Buscar</button>
          @if (errorBusqueda) {
            <p class="error-busqueda" role="alert"><app-icono nombre="error" [tamano]="18" />{{ errorBusqueda }}</p>
          }
        </form>
      </div>
      <div class="hero-arte" aria-hidden="true"><app-fondo region="organico" /></div>
    </section>

    @if (error) {
      <div class="aviso aviso-error" role="alert">
        <app-icono nombre="cloud_off" [tamano]="22" />
        <div><strong>No pudimos cargar tus datos</strong>{{ error }}</div>
      </div>
    }

    <h2 class="seccion">Tu próxima estadía</h2>
    @if (cargando) {
      <div class="tarjeta proxima" aria-busy="true"><div class="esqueleto" style="aspect-ratio:3/2"></div>
        <div style="display:grid;gap:10px"><div class="esqueleto" style="height:22px;width:40%"></div><div class="esqueleto" style="height:16px;width:70%"></div></div></div>
    } @else if (proxima) {
      <article class="tarjeta proxima">
        <app-foto-alojamiento [unidad]="unidadDe(proxima)" />
        <div class="proxima-datos">
          <app-estado-reserva [estado]="proxima.status" />
          <h3>{{ unidadDe(proxima).name }}</h3>
          <div class="datos">
            <span><app-icono nombre="login" [tamano]="18" />{{ proxima.checkIn | date:'EEE d MMM' }}</span>
            <span><app-icono nombre="logout" [tamano]="18" />{{ proxima.checkOut | date:'EEE d MMM' }}</span>
            @if (proxima.huespedes) { <span><app-icono nombre="group" [tamano]="18" />{{ proxima.huespedes }}</span> }
            @if (proxima.totalPrice != null) { <span><app-icono nombre="payments" [tamano]="18" />{{ proxima.totalPrice | currency:'CLP':'symbol-narrow':'1.0-0' }}</span> }
          </div>
          <app-pasos-reserva [estado]="proxima.status" />
        </div>
        <a class="btn btn-secundario" routerLink="/reservations">Ver mis reservas</a>
      </article>
    } @else if (!error) {
      <div class="tarjeta vacio">
        <div class="vacio-arte" aria-hidden="true"><app-fondo region="elipses" /></div>
        <div class="vacio-txt">
          <h3>Aún no tienes una estadía próxima</h3>
          <p>Busca fechas arriba o mira los alojamientos de la red.</p>
          <a class="btn btn-secundario btn-chico" routerLink="/catalog">Ver alojamientos</a>
        </div>
      </div>
    }

    <div class="encabezado">
      <div>
        <h2 class="seccion">Alojamientos para ti</h2>
        <p class="sub">Cabañas, habitaciones y lodges de la red AndesStay.</p>
      </div>
      <a class="btn btn-texto" routerLink="/catalog">Ver todos <app-icono nombre="arrow_forward" [tamano]="18" /></a>
    </div>
    <div class="grilla">
      @if (cargando) {
        @for (i of [1, 2, 3]; track i) {
          <div class="tarjeta" style="padding:14px;display:grid;gap:10px" aria-busy="true">
            <div class="esqueleto" style="aspect-ratio:3/2"></div><div class="esqueleto" style="height:20px;width:60%"></div>
          </div>
        }
      } @else {
        @for (u of destacados; track u.id) {
          <app-tarjeta-alojamiento [unidad]="u" [nombreHostal]="nombreHostal(u.hostalId)" (reservar)="reservar($event)" />
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .hero { display: grid; grid-template-columns: 1.35fr .65fr; overflow: hidden; border-radius: var(--radius-lg);
      background: var(--c-petroleo); color: var(--c-crema); box-shadow: var(--shadow-2); }
    .hero > * { min-width: 0; }
    .hero-texto { display: flex; flex-direction: column; gap: 14px; padding: clamp(24px, 4vw, 48px); }
    .hola { font-weight: 700; color: var(--c-acero); }
    .hero h1 { font-size: clamp(30px, 4.4vw, 48px); }
    .hero p { max-width: 46ch; }
    .hero-arte { position: relative; min-height: 320px; }
    .buscador { display: grid; grid-template-columns: repeat(2, minmax(150px, 1fr)) minmax(90px, 110px) auto; gap: 10px; align-items: end; margin-top: 10px; padding: 14px;
      border-radius: var(--radius); background: var(--surface); color: var(--text); }
    .buscador .btn { height: 48px; }
    .error-busqueda { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: var(--danger); }

    .aviso { margin-top: 24px; }
    h2.seccion { margin: 40px 0 14px; font-size: 26px; }
    .proxima { display: grid; grid-template-columns: 220px 1fr auto; gap: 20px; align-items: center; padding: 14px; }
    .proxima > * { min-width: 0; }
    .proxima app-foto-alojamiento { border-radius: 10px; }
    .proxima h3 { margin: 8px 0 4px; font-size: 22px; }
    .datos { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-bottom: 10px; font-size: 14px; color: var(--text-muted); }
    .datos span { display: inline-flex; align-items: center; gap: 6px; }

    .vacio { display: grid; grid-template-columns: 140px 1fr; overflow: hidden; }
    .vacio-arte { position: relative; min-height: 150px; }
    .vacio-txt { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 8px; padding: 18px; }
    .vacio-txt h3 { font-size: 20px; }
    .vacio-txt p, .sub { color: var(--text-muted); }

    .encabezado { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
    .encabezado h2.seccion { margin-bottom: 4px; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 22px; }

    @media (max-width: 860px) {
      .hero { grid-template-columns: 1fr; }
      .hero-arte { order: -1; min-height: 130px; }
      .buscador { grid-template-columns: 1fr 1fr; }
      .buscador .campo:nth-child(3), .buscador .btn { grid-column: 1 / -1; }
      .proxima { grid-template-columns: 1fr; }
      .proxima app-foto-alojamiento { aspect-ratio: 16 / 7; }
    }
  `]
})
export class PortadaClienteComponent {
  @Input() nombre = '';
  @Input() unidades: Unit[] = [];
  @Input() reservas: Reservation[] = [];
  @Input() hostales: Hostal[] = [];
  @Input() cargando = true;
  @Input() error = '';

  readonly hoy = fechaLocalIso(new Date());
  // Mismas fechas que propone el formulario de reserva: mañana y dos noches.
  desde = fechaLocalIso(diasDesdeHoy(1));
  hasta = fechaLocalIso(diasDesdeHoy(3));
  huespedes: number | null = 2;
  errorBusqueda = '';

  constructor(private router: Router) {}

  /** La reserva en curso más cercana que todavía no termina. */
  get proxima(): Reservation | undefined {
    return this.reservas
      .filter(r => r.status && !['CHECKOUT', 'CANCELADA'].includes(r.status) && (r.checkOut ?? '') >= this.hoy)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
  }

  /** Hasta seis alojamientos, primero los que tienen cupo. */
  get destacados(): Unit[] {
    return [...this.unidades]
      .sort((a, b) => Number(b.availableSlots > 0) - Number(a.availableSlots > 0))
      .slice(0, 6);
  }

  unidadDe(r: Reservation): Pick<Unit, 'name' | 'type'> {
    const u = this.unidades.find(x => x.id === r.unitId);
    return u ?? { name: 'Unidad ' + r.unitId, type: 'CABANA' };
  }

  nombreHostal(hostalId: number | null | undefined): string {
    return this.hostales.find(h => h.id === hostalId)?.nombre ?? '';
  }

  /** Mismas validaciones que la búsqueda del catálogo, para no mandar una que el backend rechaza. */
  buscar() {
    this.errorBusqueda = '';
    if (!this.desde || !this.hasta) {
      this.errorBusqueda = 'Indica la fecha de llegada y la de salida.';
      return;
    }
    if (this.desde >= this.hasta) {
      this.errorBusqueda = 'La salida tiene que ser posterior a la llegada.';
      return;
    }
    this.router.navigate(['/catalog'], {
      queryParams: { from: this.desde, to: this.hasta, huespedes: this.huespedes || null }
    });
  }

  /** Igual que «Reservar» en el catálogo: al formulario de reservas con la unidad elegida. */
  reservar(u: Unit) {
    if (!u.id || u.availableSlots === 0) return;
    this.router.navigate(['/reservations'], { queryParams: { unitId: u.id } });
  }
}
