import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Unit, Hostal, CatalogService } from '../../services/catalog.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { fechaLocalIso } from '../../core/fecha-local';
import { IconoComponent } from '../../shared/icono/icono.component';
import { FondoComponent } from '../../shared/fondo/fondo.component';
import { TarjetaAlojamientoComponent } from '../../shared/alojamiento/tarjeta-alojamiento.component';
import { DialogoConfirmacionComponent } from '../../shared/dialogo/dialogo-confirmacion.component';

// Formulario de alta vacío: el Admin escribe los datos reales. Antes proponía capacidad 2, cupo 1 y
// tarifa 0, valores inventados que era fácil dejar sin querer. validar() exige cada uno.
const UNIDAD_VACIA = (): Unit => ({
  hostalId: null, name: '', type: '' as Unit['type'], capacity: null as unknown as number,
  pricePerNight: null as unknown as number, availableSlots: null as unknown as number, description: '', active: true
});

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [DatePipe, FormsModule, IconoComponent, FondoComponent, TarjetaAlojamientoComponent, DialogoConfirmacionComponent],
  template: `
    <div class="cabecera">
      <div>
        <h1>Alojamientos</h1>
        <p class="sub">Elige fechas para ver solo lo que está libre todas las noches de tu viaje.</p>
      </div>
      @if (esAdmin) {
        <button type="button" class="btn btn-secundario" (click)="nuevaUnidad()"><app-icono nombre="add" />Nueva unidad</button>
      }
    </div>

    <!-- Búsqueda por disponibilidad: devuelve solo las unidades libres TODAS las noches -->
    <form class="tarjeta filtros" (ngSubmit)="buscar()" novalidate>
      <div class="campo">
        <label for="c-desde">Llegada</label>
        <div class="control"><input id="c-desde" type="date" name="desde" [(ngModel)]="desde" [min]="hoy" /></div>
      </div>
      <div class="campo">
        <label for="c-hasta">Salida</label>
        <div class="control"><input id="c-hasta" type="date" name="hasta" [(ngModel)]="hasta" [min]="desde || hoy" /></div>
      </div>
      <div class="campo">
        <label for="c-huespedes">Huéspedes</label>
        <div class="control"><app-icono nombre="group" />
          <input id="c-huespedes" type="number" min="1" name="huespedes" [(ngModel)]="huespedes" /></div>
      </div>
      <div class="campo">
        <label for="c-hostal">Establecimiento</label>
        <div class="control"><app-icono nombre="location_on" />
          <select id="c-hostal" name="hostalFiltro" [(ngModel)]="hostalFiltro">
            <option [ngValue]="null">Todos</option>
            @for (h of hostales; track h.id) { <option [ngValue]="h.id">{{ h.nombre }}</option> }
          </select>
        </div>
      </div>
      <button type="submit" class="btn btn-primario"><app-icono nombre="search" />Buscar disponibles</button>
      @if (buscandoPorFechas || hostalFiltro) {
        <button type="button" class="btn btn-texto" (click)="limpiarBusqueda()">Ver todas</button>
      }
    </form>

    <div class="barra">
      <p class="resumen" aria-live="polite">
        @if (!cargando) {
          {{ filtered.length }} {{ filtered.length === 1 ? 'alojamiento' : 'alojamientos' }}
          @if (buscandoPorFechas) {
            <span class="chip"><app-icono nombre="event" [tamano]="16" />libres del {{ desdeAplicado | date:'d MMM' }} al {{ hastaAplicado | date:'d MMM' }}</span>
          }
        }
      </p>
      <div class="campo filtro-nombre">
        <div class="control">
          <app-icono nombre="search" />
          <input type="text" placeholder="Filtrar por nombre o tipo" aria-label="Filtrar por nombre o tipo"
                 [(ngModel)]="searchTerm" (input)="applyFilter()" />
          @if (searchTerm) {
            <button type="button" class="limpiar" (click)="searchTerm=''; applyFilter()">
              <app-icono nombre="close" [tamano]="18" etiqueta="Limpiar filtro" />
            </button>
          }
        </div>
      </div>
    </div>

    @if (error) {
      <div class="aviso aviso-error" role="alert"><app-icono nombre="error" [tamano]="22" /><div>{{ error }}</div></div>
    }

    @if (cargando) {
      <div class="grilla" aria-busy="true" aria-label="Cargando alojamientos">
        @for (i of [1, 2, 3]; track i) {
          <div class="tarjeta" style="padding:14px;display:grid;gap:10px">
            <div class="esqueleto" style="aspect-ratio:3/2"></div>
            <div class="esqueleto" style="height:20px;width:60%"></div>
            <div class="esqueleto" style="height:14px;width:40%"></div>
          </div>
        }
      </div>
    } @else if (filtered.length > 0) {
      <div class="grilla">
        @for (u of filtered; track u.id) {
          <app-tarjeta-alojamiento [unidad]="u" [nombreHostal]="nombreHostal(u.hostalId)" [detallada]="true"
                                   [puedeReservar]="puedeReservar" (reservar)="reservar($event)">
            <!-- Editar y retirar siguen siendo solo del Admin -->
            @if (esAdmin) {
              <div acciones class="acciones-admin">
                <span class="id">#{{ u.id }}</span>
                <button type="button" class="btn btn-secundario btn-chico" (click)="editar(u)"><app-icono nombre="edit" [tamano]="18" />Editar</button>
                <button type="button" class="btn btn-peligro btn-chico" (click)="eliminar(u)"><app-icono nombre="inventory_2" [tamano]="18" />Retirar</button>
              </div>
            }
          </app-tarjeta-alojamiento>
        }
      </div>
    } @else if (!error) {
      <div class="tarjeta vacio">
        <div class="vacio-arte" aria-hidden="true"><app-fondo region="elipses" /></div>
        <div class="vacio-txt">
          <h2>{{ buscandoPorFechas ? 'No hay alojamientos libres esas noches' : 'No se encontraron alojamientos' }}</h2>
          <p>{{ buscandoPorFechas ? 'Prueba con otras fechas o con menos huéspedes.' : 'Prueba con otro nombre o quita los filtros.' }}</p>
          @if (buscandoPorFechas || hostalFiltro) {
            <button type="button" class="btn btn-secundario btn-chico" (click)="limpiarBusqueda()">Ver todas</button>
          }
        </div>
      </div>
    }

    @if (porRetirar) {
      <app-dialogo-confirmacion [titulo]="'¿Retirar «' + porRetirar.name + '» del catálogo?'"
        mensaje="Deja de aparecer en las búsquedas, pero sus reservas se conservan."
        textoConfirmar="Sí, retirar" icono="inventory_2" [peligro]="true"
        (confirmar)="confirmarRetiro()" (cancelar)="porRetirar = null" />
    }

    <!-- Alta y edición. Solo Admin: el caso le asigna la administración del inventario -->
    @if (mostrandoForm) {
      <div class="modal-fondo" (click)="cerrarForm()">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-unidad"
             (click)="$event.stopPropagation()" (keydown.escape)="cerrarForm()">
          <div class="modal-cab">
            <h2 id="titulo-unidad">{{ form.id ? 'Editar unidad' : 'Nueva unidad' }}</h2>
            <button type="button" class="btn btn-texto" (click)="cerrarForm()" [disabled]="guardando">
              <app-icono nombre="close" etiqueta="Cerrar" />
            </button>
          </div>

          @if (errorForm) {
            <div class="aviso aviso-error" role="alert"><app-icono nombre="error" [tamano]="22" /><div>{{ errorForm }}</div></div>
          }

          <div class="form-grid">
            <div class="campo ancho">
              <label for="u-hostal">Establecimiento *</label>
              <div class="control"><select id="u-hostal" [(ngModel)]="form.hostalId" name="hostalId">
                <option [ngValue]="null" disabled>Selecciona un establecimiento…</option>
                @for (h of hostales; track h.id) { <option [ngValue]="h.id">{{ h.codigo }} · {{ h.nombre }}</option> }
              </select></div>
            </div>
            <div class="campo ancho">
              <label for="u-nombre">Nombre *</label>
              <div class="control"><input id="u-nombre" type="text" [(ngModel)]="form.name" name="name" maxlength="150" /></div>
            </div>
            <div class="campo">
              <label for="u-tipo">Tipo *</label>
              <div class="control"><select id="u-tipo" [(ngModel)]="form.type" name="type">
                <option value="" disabled>Selecciona…</option>
                <option value="HABITACION">Habitación</option>
                <option value="CABANA">Cabaña</option>
                <option value="LODGE">Lodge</option>
              </select></div>
            </div>
            <div class="campo">
              <label for="u-capacidad">Capacidad (personas) *</label>
              <div class="control"><input id="u-capacidad" type="number" min="1" [(ngModel)]="form.capacity" name="capacity" /></div>
            </div>
            <div class="campo">
              <label for="u-tarifa">Tarifa por noche (CLP) *</label>
              <div class="control"><input id="u-tarifa" type="number" min="0" [(ngModel)]="form.pricePerNight" name="pricePerNight" /></div>
            </div>
            <div class="campo">
              <label for="u-cupos">Capacidad diaria *</label>
              <div class="control"><input id="u-cupos" type="number" min="0" [(ngModel)]="form.availableSlots" name="availableSlots" /></div>
              <small>Plazas por noche en las fechas que aún no tienen reservas.</small>
            </div>
            <div class="campo ancho">
              <label for="u-desc">Descripción</label>
              <div class="control"><textarea id="u-desc" rows="3" [(ngModel)]="form.description" name="description" maxlength="1000"></textarea></div>
            </div>
          </div>

          <div class="modal-pie">
            <button type="button" class="btn btn-texto" (click)="cerrarForm()" [disabled]="guardando">Cancelar</button>
            <button type="button" class="btn btn-primario" (click)="guardar()" [disabled]="guardando">
              {{ guardando ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Crear unidad') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .cabecera { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
    h1 { font-size: clamp(28px, 4vw, 38px); }
    .sub, .vacio-txt p { color: var(--text-muted); }

    .filtros { display: grid; grid-template-columns: repeat(2, minmax(140px, 1fr)) minmax(100px, .6fr) minmax(160px, 1.2fr) auto auto;
      gap: 10px; align-items: end; padding: 14px; }
    .filtros > * { min-width: 0; }
    .filtros .btn { height: 48px; }

    .barra { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin: 18px 0; }
    .resumen { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-weight: 700; min-height: 28px; }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px;
      background: var(--c-petroleo); color: var(--c-crema); font-size: 13px; }
    .filtro-nombre { width: min(360px, 100%); }
    .limpiar { display: flex; border: 0; background: none; color: var(--text-muted); cursor: pointer; }

    .aviso { margin-bottom: 18px; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 22px; }
    .acciones-admin { display: flex; align-items: center; gap: 8px; padding: 0 16px 16px; }
    .acciones-admin .btn { flex: 1; }
    .id { font-size: 12px; color: var(--text-muted); }

    .vacio { display: grid; grid-template-columns: 160px 1fr; overflow: hidden; }
    .vacio-arte { position: relative; min-height: 170px; }
    .vacio-txt { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 8px; padding: 20px; }
    .vacio-txt h2 { font-size: 21px; }

    .modal > .aviso { margin: 16px 22px 0; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; padding: 20px 22px; }
    .ancho { grid-column: 1 / -1; }

    @media (max-width: 1000px) {
      .filtros { grid-template-columns: 1fr 1fr; }
      .filtros .campo:nth-child(4), .filtros .btn { grid-column: 1 / -1; }
    }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
      .vacio { grid-template-columns: 1fr; }
      .vacio-arte { min-height: 110px; }
    }
  `]
})
export class CatalogComponent implements OnInit {

  units: Unit[] = [];
  filtered: Unit[] = [];
  hostales: Hostal[] = [];
  searchTerm = '';
  error = '';
  /** Hay una carga en curso. Antes la lista vacía mostraba «No se encontraron unidades» mientras llegaba. */
  cargando = true;
  readonly hoy = fechaLocalIso(new Date());

  // Busqueda por disponibilidad
  desde = '';
  hasta = '';
  huespedes: number | null = null;
  hostalFiltro: number | null = null;
  buscandoPorFechas = false;
  /**
   * Fechas y huéspedes de la búsqueda que produjo la lista visible. Son los que «Reservar» lleva
   * al formulario: los campos de arriba pueden haberse editado sin volver a buscar.
   */
  desdeAplicado = '';
  hastaAplicado = '';
  huespedesAplicado: number | null = null;

  // Alta y edicion
  esAdmin = false;
  puedeReservar = false;
  mostrandoForm = false;
  guardando = false;
  errorForm = '';
  form: Unit = UNIDAD_VACIA();
  /** Unidad esperando confirmación para retirarla. */
  porRetirar: Unit | null = null;

  constructor(private svc: CatalogService, private auth: AuthService,
              private router: Router, private ruta: ActivatedRoute) {}

  ngOnInit() {
    // Administrar el inventario es responsabilidad del Admin, segun el caso. El Operador y el
    // Cliente ven el catalogo pero no lo modifican. Esto solo oculta los controles: quien manda
    // es el backend, que responde 403 a cualquier escritura que no venga de un Admin.
    this.esAdmin = this.auth.getRoles().includes('Admin');
    // Los tres roles que el BFF autoriza a crear reservas. El huesped reserva a su nombre y
    // recepcion a nombre de un tercero, pero el boton es el mismo.
    this.puedeReservar = this.auth.getRoles()
      .some(r => ['Admin', 'Operador', 'Cliente'].includes(r));

    // Llegada desde el buscador de la portada: se repite aquí su búsqueda, con sus valores.
    const q = this.ruta.snapshot.queryParamMap;
    const desde = q.get('from');
    const hasta = q.get('to');
    if (desde && hasta) {
      this.desde = desde;
      this.hasta = hasta;
      const huespedes = Number(q.get('huespedes'));
      this.huespedes = huespedes > 0 ? huespedes : null;
      this.buscar();
    } else {
      this.cargarUnidades();
    }

    this.svc.getHostales().subscribe({
      next: data => this.hostales = data,
      error: () => { /* sin establecimientos el catalogo sigue siendo legible */ }
    });
  }

  private cargarUnidades() {
    this.cargando = true;
    this.svc.getAll().subscribe({
      next: data => { this.units = data; this.buscandoPorFechas = false; this.applyFilter(); this.cargando = false; },
      error: () => {
        this.error = 'No se pudo conectar con el servicio de catálogo. Verifica que el backend esté en ejecución.';
        this.cargando = false;
      }
    });
  }

  nombreHostal(hostalId: number | null | undefined): string {
    if (!hostalId) {
      return 'Sin establecimiento asignado';
    }
    const h = this.hostales.find(x => x.id === hostalId);
    return h ? h.nombre : 'Establecimiento ' + hostalId;
  }

  applyFilter() {
    const q = this.searchTerm.toLowerCase();
    this.filtered = q
      ? this.units.filter(u => u.name?.toLowerCase().includes(q) || u.type?.toLowerCase().includes(q))
      : [...this.units];
  }

  // ── Busqueda ──────────────────────────────────────────────────────────────

  buscar() {
    this.error = '';

    // Las dos fechas o ninguna: con una sola el backend responde 400, y es mejor decirlo aqui que
    // mandar una peticion que ya se sabe que va a fallar.
    if ((this.desde && !this.hasta) || (!this.desde && this.hasta)) {
      this.error = 'Para filtrar por fechas hacen falta la entrada y la salida.';
      this.cargando = false;
      return;
    }
    if (this.desde && this.hasta && this.desde >= this.hasta) {
      this.error = 'La salida tiene que ser posterior a la entrada.';
      this.cargando = false;
      return;
    }

    this.cargando = true;
    this.svc.buscar({
      from: this.desde || undefined,
      to: this.hasta || undefined,
      huespedes: this.huespedes || undefined,
      hostalId: this.hostalFiltro || undefined
    }).subscribe({
      next: data => {
        this.units = data;
        this.buscandoPorFechas = !!(this.desde && this.hasta);
        this.desdeAplicado = this.desde;
        this.hastaAplicado = this.hasta;
        this.huespedesAplicado = this.huespedes;
        this.applyFilter();
        this.cargando = false;
      },
      error: err => {
        this.error = this.mensajeDeError(err, 'No se pudo buscar la disponibilidad.');
        this.cargando = false;
      }
    });
  }

  limpiarBusqueda() {
    this.desde = '';
    this.hasta = '';
    this.huespedes = null;
    this.hostalFiltro = null;
    this.error = '';
    this.cargarUnidades();
  }

  // ── Alta y edicion ────────────────────────────────────────────────────────

  nuevaUnidad() {
    this.form = UNIDAD_VACIA();
    // Con un solo establecimiento, preseleccionarlo ahorra un clic y evita el error mas frecuente.
    if (this.hostales.length === 1) {
      this.form.hostalId = this.hostales[0].id ?? null;
    }
    this.errorForm = '';
    this.mostrandoForm = true;
  }

  editar(u: Unit) {
    this.form = { ...u };
    this.errorForm = '';
    this.mostrandoForm = true;
  }

  cerrarForm() {
    if (this.guardando) {
      return;
    }
    this.mostrandoForm = false;
    this.errorForm = '';
  }

  guardar() {
    const problema = this.validar();
    if (problema) {
      this.errorForm = problema;
      return;
    }

    this.guardando = true;
    this.errorForm = '';

    const peticion = this.form.id
      ? this.svc.update(this.form.id, this.form)
      : this.svc.create(this.form);

    peticion.subscribe({
      next: () => {
        this.guardando = false;
        this.mostrandoForm = false;
        this.limpiarBusqueda();
      },
      error: err => {
        this.guardando = false;
        this.errorForm = this.mensajeDeError(err, 'No se pudo guardar la unidad.');
      }
    });
  }

  /** Pide confirmación con el diálogo de la app (antes, confirm() del navegador). */
  eliminar(u: Unit) {
    this.porRetirar = u;
  }

  confirmarRetiro() {
    const u = this.porRetirar;
    this.porRetirar = null;
    if (!u) return;
    // Es una baja logica: la unidad queda inactiva y sus reservas historicas siguen existiendo.
    this.svc.delete(u.id!).subscribe({
      next: () => this.limpiarBusqueda(),
      error: err => this.error = this.mensajeDeError(err, 'No se pudo retirar la unidad.')
    });
  }

  private validar(): string {
    if (!this.form.hostalId) {
      return 'Elige el establecimiento al que pertenece la unidad.';
    }
    if (!this.form.name?.trim()) {
      return 'El nombre es obligatorio.';
    }
    // El formulario ya no propone un tipo por omisión, así que hay que elegirlo.
    if (!this.form.type) {
      return 'Elige el tipo de unidad.';
    }
    if (!this.form.capacity || this.form.capacity < 1) {
      return 'La capacidad tiene que ser al menos 1.';
    }
    if (this.form.pricePerNight == null || this.form.pricePerNight < 0) {
      return 'La tarifa por noche no puede ser negativa.';
    }
    if (this.form.availableSlots == null || this.form.availableSlots < 0) {
      return 'La capacidad diaria no puede ser negativa.';
    }
    return '';
  }

  /** Prefiere el mensaje del backend al generico: dice mucho mas que "algo fallo". */
  private mensajeDeError(err: any, porOmision: string): string {
    if (err?.status === 403) {
      return 'No tienes permisos para esta operación.';
    }
    const cuerpo = err?.error;
    if (cuerpo?.detalle) {
      return cuerpo.detalle;
    }
    if (cuerpo?.campos) {
      return Object.entries(cuerpo.campos).map(([c, m]) => c + ': ' + m).join(' · ');
    }
    if (cuerpo?.error) {
      return cuerpo.error;
    }
    return porOmision;
  }

  /**
   * Lleva a la pantalla de reservas con esta unidad ya elegida y, si la lista viene de una búsqueda
   * por fechas, con esas fechas y huéspedes: son los que el cliente ya escribió.
   *
   * De la unidad se pasa solo el identificador, no la unidad entera: el formulario de reservas
   * comprueba de todos modos que siga teniendo cupo en esas fechas, y confiar en datos arrastrados
   * desde otra pantalla sería quedarse con una foto vieja del catálogo.
   */
  reservar(u: Unit) {
    if (!u.id || u.availableSlots === 0) {
      return;
    }
    const queryParams: Record<string, string | number> = { unitId: u.id };
    if (this.buscandoPorFechas) {
      queryParams['from'] = this.desdeAplicado;
      queryParams['to'] = this.hastaAplicado;
      if (this.huespedesAplicado) {
        queryParams['huespedes'] = this.huespedesAplicado;
      }
    }
    this.router.navigate(['/reservations'], { queryParams });
  }

}
