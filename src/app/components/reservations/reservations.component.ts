import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Reservation, ReservationService } from '../../services/reservation.service';
import { Unit, CatalogService } from '../../services/catalog.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { fechaLocalIso } from '../../core/fecha-local';
import { IconoComponent } from '../../shared/icono/icono.component';
import { FondoComponent } from '../../shared/fondo/fondo.component';
import { FotoAlojamientoComponent } from '../../shared/alojamiento/foto-alojamiento.component';
import { tipoAlojamiento } from '../../shared/alojamiento/alojamiento-meta';
import { DialogoConfirmacionComponent } from '../../shared/dialogo/dialogo-confirmacion.component';
import { EstadoReservaComponent } from '../../shared/reserva/estado-reserva.component';
import { ESTADOS_RESERVA, estadoReserva, PasoSiguiente, pasosSiguientes } from '../../shared/reserva/estado-reserva';

/** Cambio de estado esperando que el usuario lo confirme en el diálogo. */
interface CambioPendiente {
  reserva: Reservation;
  hacia: string;
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, IconoComponent, FondoComponent, FotoAlojamientoComponent,
    DialogoConfirmacionComponent, EstadoReservaComponent],
  template: `
    <!-- Alta de reserva. La puede usar el huesped y tambien recepcion en el mostrador. -->
    @if (mostrandoForm) {
      <div class="modal-fondo" (click)="cerrarForm()">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-reserva"
             (click)="$event.stopPropagation()" (keydown.escape)="cerrarForm()">

          @if (reservaCreada) {
            <!-- Confirmación tras crear (D4): con los datos que devolvió el backend -->
            <div class="exito" aria-live="polite">
              <div class="franja" aria-hidden="true"><app-fondo region="organico" /></div>
              <div class="exito-cuerpo">
                <span class="sello"><app-icono nombre="task_alt" [relleno]="true" [tamano]="36" /></span>
                <h2 id="titulo-reserva">¡Reserva creada!</h2>
                <p class="sub">
                  @if (reservaCreada.status === 'CREADA') {
                    Quedó <b>por confirmar</b>. Recepción la revisará y cambiará su estado; puedes seguirla en esta pantalla.
                  } @else {
                    Su estado actual es el que ves abajo.
                  }
                </p>
                <app-estado-reserva [estado]="reservaCreada.status" />
                <dl>
                  @if (reservaCreada.id) { <dt>Reserva</dt><dd>#{{ reservaCreada.id }}</dd> }
                  <dt>Alojamiento</dt><dd>{{ nombreUnidad(reservaCreada.unitId) }}</dd>
                  <dt>Fechas</dt><dd>{{ reservaCreada.checkIn | date:'d MMM' }} → {{ reservaCreada.checkOut | date:'d MMM y' }}</dd>
                  @if (reservaCreada.huespedes) { <dt>Huéspedes</dt><dd>{{ reservaCreada.huespedes }}</dd> }
                  @if (reservaCreada.totalPrice != null) { <dt>Total</dt><dd>{{ reservaCreada.totalPrice | currency:'CLP':'symbol-narrow':'1.0-0' }}</dd> }
                  @if (!esCliente && reservaCreada.guestEmail) { <dt>Huésped</dt><dd>{{ reservaCreada.guestEmail }}</dd> }
                </dl>
                <button type="button" class="btn btn-primario" (click)="cerrarForm()">Listo</button>
              </div>
            </div>
          } @else {
            <div class="modal-cab">
              <h2 id="titulo-reserva">Nueva reserva</h2>
              <button type="button" class="btn btn-texto" (click)="cerrarForm()" [disabled]="guardando">
                <app-icono nombre="close" etiqueta="Cerrar" />
              </button>
            </div>

            <ol class="stepper" aria-label="Pasos para reservar">
              <li [class.hecho]="paso > 1" [class.actual]="paso === 1"><span class="n">1</span><span class="t">Fechas y huéspedes</span></li>
              <li [class.hecho]="paso > 2" [class.actual]="paso === 2"><span class="n">2</span><span class="t">Elige alojamiento</span></li>
              <li [class.actual]="paso === 3"><span class="n">3</span><span class="t">Confirma</span></li>
            </ol>

            <div class="modal-cuerpo">
              @if (errorForm) {
                <div class="aviso aviso-error" role="alert"><app-icono nombre="error" [tamano]="22" /><div>{{ errorForm }}</div></div>
              }
              @if (unidadPedida > 0 && !busquedaHecha && !buscandoUnidades) {
                <div class="aviso aviso-info"><app-icono nombre="info" [tamano]="22" />
                  <div>Elige las fechas y busca: así comprobamos si el alojamiento que elegiste está libre esas noches.</div></div>
              }

              <div class="fechas">
                <div class="campo">
                  <label for="r-entrada">Llegada *</label>
                  <div class="control"><input id="r-entrada" type="date" [(ngModel)]="form.checkIn" name="checkIn" [min]="hoy"
                         (change)="unidadesLibres = []; form.unitId = 0; busquedaHecha = false" /></div>
                </div>
                <div class="campo">
                  <label for="r-salida">Salida *</label>
                  <div class="control"><input id="r-salida" type="date" [(ngModel)]="form.checkOut" name="checkOut" [min]="form.checkIn || hoy"
                         (change)="unidadesLibres = []; form.unitId = 0; busquedaHecha = false" /></div>
                </div>
                <div class="campo">
                  <label for="r-huespedes">Huéspedes *</label>
                  <div class="control"><app-icono nombre="group" />
                    <input id="r-huespedes" type="number" min="1" [(ngModel)]="form.huespedes" name="huespedes"
                           (change)="unidadesLibres = []; form.unitId = 0; busquedaHecha = false" /></div>
                </div>
                <button type="button" class="btn btn-secundario" (click)="buscarUnidades()" [disabled]="buscandoUnidades">
                  <app-icono nombre="search" />{{ buscandoUnidades ? 'Buscando…' : 'Buscar libres' }}
                </button>
              </div>

              @if (unidadesLibres.length > 0) {
                <fieldset class="opciones">
                  <legend>{{ unidadesLibres.length }} {{ unidadesLibres.length === 1 ? 'alojamiento libre' : 'alojamientos libres' }} todas las noches</legend>
                  @for (u of unidadesLibres; track u.id) {
                    <label class="opcion" [class.elegida]="form.unitId === u.id">
                      <input type="radio" name="unitId" [value]="u.id" [(ngModel)]="form.unitId" class="sr-only" />
                      <app-foto-alojamiento [unidad]="u" />
                      <span class="opcion-datos">
                        <strong>{{ u.name }}</strong>
                        <small>{{ tipo(u.type) }} · hasta {{ u.capacity }} {{ u.capacity === 1 ? 'persona' : 'personas' }}</small>
                      </span>
                      <span class="opcion-precio">{{ u.pricePerNight | currency:'CLP':'symbol-narrow':'1.0-0' }}<small>/ noche</small></span>
                    </label>
                  }
                </fieldset>
              }

              @if (busquedaHecha && unidadesLibres.length === 0) {
                <div class="aviso aviso-info"><app-icono nombre="event_busy" [tamano]="22" />
                  <div>No hay unidades libres todas las noches de ese rango con esa capacidad. Prueba con otras fechas.</div></div>
              }

              <!-- Recepcion reserva a nombre de un tercero; el huesped, a su propio nombre, y el
                   backend fuerza sus datos desde el token aunque aqui se escriba otra cosa. -->
              @if (!esCliente && unidadesLibres.length > 0) {
                <div class="campo">
                  <label for="r-correo">Correo del huésped *</label>
                  <div class="control"><app-icono nombre="mail" />
                    <input id="r-correo" type="email" [(ngModel)]="form.guestEmail" name="guestEmail" autocomplete="off" /></div>
                </div>
              }

              @if (totalEstimado > 0) {
                <div class="total">
                  <span>{{ noches }} {{ noches === 1 ? 'noche' : 'noches' }} · total estimado</span>
                  <strong>{{ totalEstimado | currency:'CLP':'symbol-narrow':'1.0-0' }}</strong>
                </div>
              }
            </div>

            <div class="modal-pie">
              <button type="button" class="btn btn-texto" (click)="cerrarForm()" [disabled]="guardando">Cancelar</button>
              <button type="button" class="btn btn-primario" (click)="guardar()" [disabled]="guardando || !form.unitId">
                {{ guardando ? 'Creando…' : 'Crear reserva' }}
              </button>
            </div>
          }
        </div>
      </div>
    }

    @if (pendiente) {
      <app-dialogo-confirmacion [titulo]="pendiente.titulo" [mensaje]="pendiente.mensaje"
        [textoConfirmar]="pendiente.textoConfirmar" [peligro]="pendiente.hacia === 'CANCELADA'"
        [icono]="pendiente.hacia === 'CANCELADA' ? 'cancel' : 'help'"
        (confirmar)="confirmarCambio()" (cancelar)="pendiente = null" />
    }

    <div class="cabecera">
      <div>
        <h1>{{ esCliente ? 'Mis reservas' : 'Reservas' }}</h1>
        <p class="sub">
          {{ reservations.length }} {{ reservations.length === 1 ? 'resultado' : 'resultados' }}
          @if (esCliente) { <span> · solo las tuyas</span> }
        </p>
      </div>
      @if (puedeReservar) {
        <button type="button" class="btn btn-primario" (click)="nuevaReserva()"><app-icono nombre="add" />Nueva reserva</button>
      }
    </div>

    <div class="tarjeta filtros">
      <div class="campo">
        <label for="f-estado">Estado</label>
        <div class="control"><select id="f-estado" [(ngModel)]="filterStatus" (change)="load()">
          <option value="">Todos</option>
          @for (s of statuses; track s) { <option [value]="s">{{ etiquetaEstado(s) }}</option> }
        </select></div>
      </div>
      <div class="campo">
        <label for="f-desde">Desde</label>
        <div class="control"><input id="f-desde" type="date" [(ngModel)]="filterFrom" (change)="load()" /></div>
      </div>
      <div class="campo">
        <label for="f-hasta">Hasta</label>
        <div class="control"><input id="f-hasta" type="date" [(ngModel)]="filterTo" (change)="load()" /></div>
      </div>
      @if (filterStatus || filterFrom || filterTo) {
        <button type="button" class="btn btn-texto" (click)="clearFilters()"><app-icono nombre="close" [tamano]="18" />Limpiar</button>
      }
    </div>

    @if (error) {
      <div class="aviso aviso-error" role="alert"><app-icono nombre="error" [tamano]="22" /><div>{{ error }}</div></div>
    }

    @if (reservations.length > 0) {
      <div class="tarjeta tabla">
        <table>
          <thead>
            <tr><th>#</th><th>Unidad</th><th>Huésped</th><th>Llegada</th><th>Salida</th><th>Pers.</th><th>Total</th><th>Estado</th><th>Acción</th></tr>
          </thead>
          <tbody>
            @for (r of reservations; track r.id) {
              <tr>
                <td class="id">{{ r.id }}</td>
                <td>Unidad {{ r.unitId }}</td>
                <td class="huesped">{{ r.guestEmail }}</td>
                <td>{{ r.checkIn | date:'d MMM y' }}</td>
                <td>{{ r.checkOut | date:'d MMM y' }}</td>
                <td>{{ r.huespedes ?? '—' }}</td>
                <td>{{ r.totalPrice != null ? (r.totalPrice | currency:'CLP':'symbol-narrow':'1.0-0') : '—' }}</td>
                <td><app-estado-reserva [estado]="r.status" /></td>
                <td>
                  <div class="acciones">
                    <!-- Recepcion y administracion: solo los pasos que el backend acepta desde este estado -->
                    @if (!esCliente && enCurso(r)) {
                      @for (p of pasos(r); track p.hacia) {
                        <button type="button" class="btn btn-chico" [class.btn-peligro]="p.peligro" [class.btn-secundario]="!p.peligro"
                                [disabled]="cambiando === r.id" (click)="pedirCambio(r, p)">{{ p.etiqueta }}</button>
                      }
                    }
                    <!-- El huesped solo puede cancelar, y solo mientras siga en CREADA.
                         Es la transicion 3 y la regla 5 del contrato de estados. -->
                    @if (esCliente && r.status === 'CREADA') {
                      <button type="button" class="btn btn-peligro btn-chico" [disabled]="cambiando === r.id" (click)="cancelar(r)">Cancelar</button>
                    }
                    @if (!enCurso(r) || (esCliente && r.status !== 'CREADA')) {
                      <span class="final">{{ enCurso(r) ? 'La gestiona recepción' : 'Estado final' }}</span>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (reservations.length === 0 && !error) {
      <div class="tarjeta vacio">
        <div class="vacio-arte" aria-hidden="true"><app-fondo region="elipses" /></div>
        <div class="vacio-txt">
          <h2>Sin reservas para los filtros seleccionados</h2>
          @if (esCliente) {
            <p>Cuando reserves un alojamiento, aparecerá aquí con su estado.</p>
            <a class="btn btn-secundario btn-chico" routerLink="/catalog">Ver alojamientos</a>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    :host-context(.page-content) { padding: 28px 32px; }

    .cabecera { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
    h1 { font-size: clamp(28px, 4vw, 38px); }
    .sub, .vacio-txt p { color: var(--text-muted); }

    .filtros { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; padding: 14px; margin-bottom: 18px; }
    .filtros .campo { min-width: 160px; flex: 1; max-width: 240px; }
    .aviso { margin-bottom: 18px; }

    .tabla { overflow-x: auto; }
    table { width: 100%; min-width: 960px; border-collapse: collapse; }
    th { padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;
      color: var(--text-muted); background: var(--surface-sutil); border-bottom: 1px solid var(--border); }
    td { padding: 12px 14px; font-size: 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tbody tr:last-child td { border-bottom: 0; }
    .id { font-weight: 800; }
    .huesped { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .acciones { display: flex; gap: 6px; flex-wrap: wrap; }
    .final { font-size: 12px; color: var(--text-muted); }

    .vacio { display: grid; grid-template-columns: 160px 1fr; overflow: hidden; }
    .vacio-arte { position: relative; min-height: 160px; }
    .vacio-txt { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 8px; padding: 20px; }
    .vacio-txt h2 { font-size: 21px; }

    /* Formulario */
    .stepper { display: flex; gap: 6px; padding: 12px 22px; list-style: none; background: var(--c-crema); }
    .stepper li { display: flex; align-items: center; gap: 8px; flex: 1; font-size: 13px; font-weight: 700; color: var(--text-muted); }
    .stepper .n { display: grid; place-items: center; flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
      border: 2px solid var(--border); background: var(--surface); font-weight: 800; }
    .stepper li.actual { color: var(--text); }
    .stepper li.actual .n { border-color: var(--c-petroleo); color: var(--c-petroleo); }
    .stepper li.hecho .n { border-color: var(--c-petroleo); background: var(--c-petroleo); color: var(--c-crema); }
    .fechas { display: grid; grid-template-columns: repeat(2, minmax(130px, 1fr)) minmax(90px, .7fr) auto; gap: 10px; align-items: end; }
    .fechas .btn { height: 48px; }
    .opciones { display: grid; gap: 10px; border: 0; }
    .opciones legend { margin-bottom: 8px; font-size: 14px; color: var(--text-muted); }
    .opcion { display: grid; grid-template-columns: 96px 1fr auto; gap: 14px; align-items: center; padding: 10px;
      border: 2px solid var(--border); border-radius: var(--radius); cursor: pointer; }
    .opcion:focus-within { box-shadow: var(--focus-ring); }
    .opcion.elegida { border-color: var(--c-petroleo); background: var(--surface-sutil); }
    .opcion app-foto-alojamiento { border-radius: 8px; }
    .opcion-datos { display: flex; flex-direction: column; min-width: 0; }
    .opcion-datos small, .opcion-precio small { color: var(--text-muted); font-weight: 600; }
    .opcion-precio { display: flex; flex-direction: column; align-items: flex-end; font-weight: 800; }
    .total { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 14px 16px;
      border-radius: var(--radius); background: var(--c-crema); }
    .total strong { font-size: 22px; }

    /* Confirmación */
    .franja { position: relative; height: 96px; }
    .exito-cuerpo { display: grid; justify-items: center; gap: 10px; padding: 0 22px 22px; text-align: center; }
    .sello { display: grid; place-items: center; width: 72px; height: 72px; margin-top: -36px; position: relative;
      border: 5px solid var(--surface); border-radius: 50%; background: var(--c-petroleo); color: var(--c-crema); }
    .exito h2 { font-size: 26px; }
    dl { display: grid; grid-template-columns: auto auto; gap: 4px 18px; padding: 12px 16px; text-align: left; font-size: 14px;
      border-radius: var(--radius); background: var(--c-crema); }
    dt { color: var(--text-muted); }
    dd { font-weight: 700; }

    @media (max-width: 640px) {
      :host-context(.page-content) { padding: 20px 16px; }
      .fechas { grid-template-columns: 1fr 1fr; }
      .fechas .campo:nth-child(3), .fechas .btn { grid-column: 1 / -1; }
      .stepper .t { display: none; }
      .stepper li.actual .t { display: inline; }
      .opcion { grid-template-columns: 72px 1fr; }
      .opcion-precio { grid-column: 2; align-items: flex-start; }
      .vacio { grid-template-columns: 1fr; }
      .vacio-arte { min-height: 110px; }
    }
  `]
})
export class ReservationsComponent implements OnInit {

  reservations: Reservation[] = [];
  // SIN TILDE, igual que el enum del backend (ver shared/reserva/estado-reserva.ts).
  statuses = ESTADOS_RESERVA;
  filterStatus = '';
  filterFrom = '';
  filterTo = '';
  error = '';

  esCliente = false;
  puedeReservar = false;

  // Cambios de estado
  /** Cambio esperando confirmación en el diálogo (cancelaciones). */
  pendiente: CambioPendiente | null = null;
  /** Reserva cuyo cambio de estado está en curso: sus botones se desactivan para no repetirlo. */
  cambiando: number | null = null;

  // Alta de reserva
  mostrandoForm = false;
  guardando = false;
  buscandoUnidades = false;
  busquedaHecha = false;
  errorForm = '';
  unidadesLibres: Unit[] = [];
  /** La reserva recién creada, tal como la devolvió el backend: se muestra en la confirmación. */
  reservaCreada: Reservation | null = null;
  readonly hoy = fechaLocalIso(new Date());
  /**
   * Unidad que llega elegida desde el catalogo, pendiente de confirmar que tenga cupo.
   *
   * No se asigna directamente a form.unitId: el desplegable solo ofrece las unidades libres en el
   * rango, y dar por buena una que no lo este dejaria el formulario mostrando una eleccion que el
   * backend va a rechazar con un 409.
   */
  unidadPedida = 0;
  form: Reservation = this.reservaVacia();

  constructor(private svc: ReservationService,
              private catalogo: CatalogService,
              private auth: AuthService,
              private ruta: ActivatedRoute) {}

  ngOnInit() {
    const roles = this.auth.getRoles();
    // Un Cliente recibe SOLO sus reservas: el filtro lo aplica el backend con el sub de su token,
    // no un parametro, asi que no puede pedir las de otro.
    this.esCliente = roles.includes('Cliente') && !roles.includes('Admin') && !roles.includes('Operador');
    this.puedeReservar = roles.some(r => ['Admin', 'Operador', 'Cliente'].includes(r));
    this.load();

    // Llegada desde el catalogo con una unidad elegida: se abre el formulario con las fechas y
    // huespedes que el cliente ya busco, si los hay. Con fechas se busca de inmediato si esa unidad
    // esta libre; sin ellas, el formulario espera a que las escriba. Nunca se inventan fechas.
    const q = this.ruta.snapshot.queryParamMap;
    const pedida = Number(q.get('unitId'));
    if (pedida > 0 && this.puedeReservar) {
      this.nuevaReserva();
      this.unidadPedida = pedida;
      const desde = q.get('from');
      const hasta = q.get('to');
      const huespedes = Number(q.get('huespedes'));
      if (huespedes > 0) {
        this.form.huespedes = huespedes;
      }
      if (desde && hasta) {
        this.form.checkIn = desde;
        this.form.checkOut = hasta;
        this.buscarUnidades();
      }
    }
  }

  etiquetaEstado(status: string): string {
    return estadoReserva(status).etiqueta;
  }

  tipo(type: string): string {
    return tipoAlojamiento(type).etiqueta;
  }

  /** Paso del formulario: 1 fechas, 2 elegir alojamiento, 3 confirmar. */
  get paso(): number {
    if (!this.busquedaHecha || this.unidadesLibres.length === 0) return 1;
    return this.form.unitId ? 3 : 2;
  }

  nombreUnidad(unitId: number): string {
    return this.unidadesLibres.find(u => u.id === unitId)?.name ?? 'Unidad ' + unitId;
  }

  /** Una reserva en CHECKOUT o CANCELADA es terminal: de ahi no sale ninguna transicion. */
  enCurso(r: Reservation): boolean {
    return r.status != null && r.status !== 'CHECKOUT' && r.status !== 'CANCELADA';
  }

  pasos(r: Reservation): PasoSiguiente[] {
    return pasosSiguientes(r.status);
  }

  load() {
    this.error = '';
    this.svc.getAll(this.filterStatus || undefined, this.filterFrom || undefined, this.filterTo || undefined)
      .subscribe({
        next: data => this.reservations = data,
        error: () => this.error = 'No se pudo conectar con el servicio de reservas. Verifica que el backend esté en ejecución.'
      });
  }

  clearFilters() {
    this.filterStatus = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.load();
  }

  changeStatus(r: Reservation, newStatus: string) {
    if (!newStatus || !r.id) return;
    this.error = '';
    this.cambiando = r.id;
    this.svc.changeStatus(r.id, newStatus).subscribe({
      next: updated => { r.status = updated.status; this.cambiando = null; },
      error: err => {
        this.error = this.mensajeDeError(err, 'No se pudo cambiar el estado de la reserva.');
        this.cambiando = null;
      }
    });
  }

  /** Personal: avanzar se aplica directo; cancelar, que es irreversible, se confirma antes. */
  pedirCambio(r: Reservation, p: PasoSiguiente) {
    if (!p.peligro) {
      this.changeStatus(r, p.hacia);
      return;
    }
    this.pendiente = {
      reserva: r, hacia: p.hacia, textoConfirmar: 'Sí, cancelar',
      titulo: '¿Cancelar la reserva #' + r.id + '?',
      mensaje: 'Es definitivo: una reserva cancelada no se puede retomar.'
    };
  }

  /** Huésped: solo puede cancelar, y se le pide confirmación como antes con confirm(). */
  cancelar(r: Reservation) {
    this.pendiente = {
      reserva: r, hacia: 'CANCELADA', textoConfirmar: 'Sí, cancelar',
      titulo: '¿Cancelar la reserva #' + r.id + '?',
      mensaje: 'Es definitivo: si después quieres esas fechas, tendrás que hacer una reserva nueva.'
    };
  }

  confirmarCambio() {
    if (!this.pendiente) return;
    const { reserva, hacia } = this.pendiente;
    this.pendiente = null;
    this.changeStatus(reserva, hacia);
  }

  // ── Alta ──────────────────────────────────────────────────────────────────

  nuevaReserva() {
    this.form = this.reservaVacia();
    this.unidadPedida = 0;
    this.unidadesLibres = [];
    this.busquedaHecha = false;
    this.errorForm = '';
    this.reservaCreada = null;
    this.mostrandoForm = true;
  }

  cerrarForm() {
    if (this.guardando) return;
    this.mostrandoForm = false;
    this.errorForm = '';
    this.reservaCreada = null;
  }

  /** Noches de la estadia. El dia de salida no se cobra: el huesped se va esa mañana. */
  get noches(): number {
    if (!this.form.checkIn || !this.form.checkOut) return 0;
    const ms = new Date(this.form.checkOut).getTime() - new Date(this.form.checkIn).getTime();
    return ms > 0 ? Math.round(ms / 86400000) : 0;
  }

  get totalEstimado(): number {
    const u = this.unidadesLibres.find(x => x.id === this.form.unitId);
    return u ? u.pricePerNight * this.noches : 0;
  }

  buscarUnidades() {
    this.errorForm = '';
    if (!this.form.checkIn || !this.form.checkOut) {
      this.errorForm = 'Indica la fecha de entrada y la de salida.';
      return;
    }
    if (this.form.checkIn >= this.form.checkOut) {
      this.errorForm = 'La salida tiene que ser posterior a la entrada.';
      return;
    }

    this.buscandoUnidades = true;
    this.catalogo.buscar({
      from: this.form.checkIn,
      to: this.form.checkOut,
      huespedes: this.form.huespedes || undefined
    }).subscribe({
      next: data => {
        this.unidadesLibres = data;
        this.busquedaHecha = true;
        this.buscandoUnidades = false;
        if (this.unidadPedida > 0) {
          // Vino del catalogo. Si tiene cupo se deja elegida; si no, se dice por que, que es mas
          // util que devolver una lista donde no aparece y dejar al usuario buscandola.
          const libre = data.find(u => u.id === this.unidadPedida);
          if (libre) {
            this.form.unitId = libre.id!;
          } else {
            this.errorForm = 'La unidad que elegiste no tiene cupo todas las noches de ese rango. '
                           + 'Prueba con otras fechas o elige otra de la lista.';
          }
          this.unidadPedida = 0;
          return;
        }

        // Con una sola opcion, elegirla ahorra un clic.
        if (data.length === 1) {
          this.form.unitId = data[0].id!;
        }
      },
      error: err => {
        this.buscandoUnidades = false;
        this.errorForm = this.mensajeDeError(err, 'No se pudieron buscar las unidades libres.');
      }
    });
  }

  guardar() {
    if (!this.form.unitId) {
      this.errorForm = 'Elige una unidad.';
      return;
    }
    // Ya no hay un número de huéspedes por omisión: hay que indicarlo.
    if (!this.form.huespedes || this.form.huespedes < 1) {
      this.errorForm = 'Indica cuántos huéspedes se alojarán.';
      return;
    }
    if (!this.esCliente && !this.form.guestEmail?.trim()) {
      this.errorForm = 'Indica el correo del huésped.';
      return;
    }

    this.guardando = true;
    this.errorForm = '';
    this.svc.create(this.form).subscribe({
      next: creada => {
        this.guardando = false;
        // El modal queda abierto mostrando la confirmación; se cierra con «Listo».
        this.reservaCreada = creada;
        this.load();
      },
      error: err => {
        this.guardando = false;
        this.errorForm = this.mensajeDeError(err, 'No se pudo crear la reserva.');
      }
    });
  }

  private reservaVacia(): Reservation {
    // Vacía: sin fechas ni huéspedes inventados. Las pone el cliente, o llegan de su búsqueda.
    return {
      unitId: 0,
      checkIn: '',
      checkOut: '',
      huespedes: undefined,
      guestEmail: ''
    } as Reservation;
  }

  /** Prefiere el mensaje del backend al generico: el contrato devuelve codigos muy concretos. */
  private mensajeDeError(err: any, porOmision: string): string {
    if (err?.status === 403) {
      return 'No tienes permisos para esta operación.';
    }
    const c = err?.error;
    if (c?.error === 'SIN_DISPONIBILIDAD') {
      return 'La unidad se quedó sin cupo para esas fechas. La reserva sigue como estaba.';
    }
    if (c?.error === 'TRANSICION_INVALIDA') {
      return 'No se puede pasar de ' + c.desde + ' a ' + c.hacia + '.';
    }
    if (c?.detalle) return c.detalle;
    if (c?.campos) {
      return Object.entries(c.campos).map(([k, v]) => k + ': ' + v).join(' · ');
    }
    if (c?.error) return c.error;
    return porOmision;
  }
}
