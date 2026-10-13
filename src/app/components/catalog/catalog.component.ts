import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Unit, Hostal, CatalogService } from '../../services/catalog.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

// Las claves son los valores REALES del enum UnitType del backend. Antes decian CABAÑA, HOSTAL,
// SUITE y DORM, que no existen en ningun sitio, asi que ninguna unidad encontraba su icono y
// todas caian al generico.
const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  HABITACION: { icon: '🛏️', color: '#166534', bg: '#dcfce7' },
  CABANA:     { icon: '🏡', color: '#0e7490', bg: '#cffafe' },
  LODGE:      { icon: '🏔️', color: '#7c3aed', bg: '#f3e8ff' },
};

const UNIDAD_VACIA = (): Unit => ({
  hostalId: null, name: '', type: 'CABANA', capacity: 2,
  pricePerNight: 0, availableSlots: 1, description: '', active: true
});

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Catálogo de Unidades</h1>
          <p class="page-sub">
            {{ filtered.length }} unidad{{ filtered.length !== 1 ? 'es' : '' }}
            <span *ngIf="buscandoPorFechas"> · libres del {{ desde }} al {{ hasta }}</span>
          </p>
        </div>
        <button class="btn-primary" *ngIf="esAdmin" (click)="nuevaUnidad()">
          ＋ Nueva unidad
        </button>
      </div>

      <!-- Search bar -->
      <div class="search-bar">
        <span class="search-icon">🔎</span>
        <input type="text" placeholder="Buscar por nombre o tipo…"
               [(ngModel)]="searchTerm" (input)="applyFilter()" />
        <button class="btn-clear" *ngIf="searchTerm" (click)="searchTerm=''; applyFilter()">✕</button>
      </div>

      <!-- Busqueda por disponibilidad: devuelve solo las unidades libres TODAS las noches -->
      <div class="filtros">
        <div class="campo">
          <label>Entrada</label>
          <input type="date" [(ngModel)]="desde" />
        </div>
        <div class="campo">
          <label>Salida</label>
          <input type="date" [(ngModel)]="hasta" />
        </div>
        <div class="campo campo-corto">
          <label>Huéspedes</label>
          <input type="number" min="1" [(ngModel)]="huespedes" />
        </div>
        <div class="campo">
          <label>Establecimiento</label>
          <select [(ngModel)]="hostalFiltro">
            <option [ngValue]="null">Todos</option>
            <option *ngFor="let h of hostales" [ngValue]="h.id">{{ h.nombre }}</option>
          </select>
        </div>
        <button class="btn-primary" (click)="buscar()">Buscar disponibles</button>
        <button class="btn-ghost" *ngIf="buscandoPorFechas || hostalFiltro" (click)="limpiarBusqueda()">
          Ver todas
        </button>
      </div>

      <!-- Error -->
      <div class="alert alert-error" *ngIf="error">
        <span>⚠️</span> {{ error }}
      </div>

      <!-- Cards view -->
      <div class="unit-grid" *ngIf="filtered.length > 0">
        <div class="unit-card" *ngFor="let u of filtered">
          <div class="unit-top" [style.background]="typeMeta(u.type).bg">
            <span class="unit-emoji">{{ typeMeta(u.type).icon }}</span>
            <span class="type-tag" [style.color]="typeMeta(u.type).color"
                  [style.background]="typeMeta(u.type).bg">{{ u.type }}</span>
          </div>
          <div class="unit-body">
            <h3 class="unit-name">{{ u.name }}</h3>
            <p class="unit-hostal">{{ nombreHostal(u.hostalId) }}</p>
            <div class="unit-stats">
              <div class="stat">
                <span class="stat-icon">👥</span>
                <span>{{ u.capacity }} pax</span>
              </div>
              <div class="stat">
                <span class="stat-icon">💰</span>
                <span>{{ u.pricePerNight | currency:'CLP':'symbol':'1.0-0' }}</span>
              </div>
              <div class="stat">
                <span class="stat-icon">🟢</span>
                <span class="slots" [class.low]="u.availableSlots === 0">
                  {{ u.availableSlots === 0 ? 'Sin cupos' : u.availableSlots + ' cupos' }}
                </span>
              </div>
            </div>
          </div>
          <!-- Reservar lo ve todo el que puede reservar, incluido el huesped; editar y retirar
               siguen siendo solo del Admin. Se desactiva sin cupos en lugar de ocultarse: que la
               unidad exista pero no tenga disponibilidad es informacion util. -->
          <div class="unit-acciones" *ngIf="puedeReservar || esAdmin">
            <button class="btn-primary" *ngIf="puedeReservar"
                    [disabled]="u.availableSlots === 0"
                    [title]="u.availableSlots === 0 ? 'Sin cupos disponibles' : 'Reservar esta unidad'"
                    (click)="reservar(u)">Reservar</button>
            <button class="btn-ghost" *ngIf="esAdmin" (click)="editar(u)">Editar</button>
            <button class="btn-ghost btn-peligro" *ngIf="esAdmin" (click)="eliminar(u)">Retirar</button>
          </div>
          <div class="unit-footer">
            <span class="unit-id">#{{ u.id }}</span>
            <span class="avail-badge" [class.avail-ok]="u.availableSlots > 0" [class.avail-no]="u.availableSlots === 0">
              {{ u.availableSlots > 0 ? 'Disponible' : 'Sin disponibilidad' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div class="empty-state" *ngIf="filtered.length === 0 && !error">
        <span class="empty-icon">🏚️</span>
        <p>No se encontraron unidades.</p>
      </div>

      <!-- Alta y edicion. Solo Admin: el caso le asigna la administracion del inventario -->
      <div class="modal-fondo" *ngIf="mostrandoForm" (click)="cerrarForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2 class="modal-titulo">{{ form.id ? 'Editar unidad' : 'Nueva unidad' }}</h2>

          <div class="alert alert-error" *ngIf="errorForm"><span>⚠️</span> {{ errorForm }}</div>

          <div class="form-grid">
            <div class="campo campo-ancho">
              <label>Establecimiento *</label>
              <select [(ngModel)]="form.hostalId" name="hostalId">
                <option [ngValue]="null" disabled>Selecciona un establecimiento…</option>
                <option *ngFor="let h of hostales" [ngValue]="h.id">
                  {{ h.codigo }} · {{ h.nombre }}
                </option>
              </select>
            </div>
            <div class="campo campo-ancho">
              <label>Nombre *</label>
              <input type="text" [(ngModel)]="form.name" name="name"
                     placeholder="Cabaña Coigüe" maxlength="150" />
            </div>
            <div class="campo">
              <label>Tipo *</label>
              <select [(ngModel)]="form.type" name="type">
                <option value="HABITACION">Habitación</option>
                <option value="CABANA">Cabaña</option>
                <option value="LODGE">Lodge</option>
              </select>
            </div>
            <div class="campo">
              <label>Capacidad *</label>
              <input type="number" min="1" [(ngModel)]="form.capacity" name="capacity" />
            </div>
            <div class="campo">
              <label>Tarifa por noche (CLP) *</label>
              <input type="number" min="0" [(ngModel)]="form.pricePerNight" name="pricePerNight" />
            </div>
            <div class="campo">
              <label>Capacidad diaria *</label>
              <input type="number" min="0" [(ngModel)]="form.availableSlots" name="availableSlots" />
              <small>Plazas por noche en las fechas que aún no tienen reservas.</small>
            </div>
            <div class="campo campo-ancho">
              <label>Descripción</label>
              <textarea rows="3" [(ngModel)]="form.description" name="description"
                        maxlength="1000" placeholder="Cabaña de madera nativa con tinaja…"></textarea>
            </div>
          </div>

          <div class="modal-acciones">
            <button class="btn-ghost" (click)="cerrarForm()" [disabled]="guardando">Cancelar</button>
            <button class="btn-primary" (click)="guardar()" [disabled]="guardando">
              {{ guardando ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Crear unidad') }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }

    .page {
      padding: 36px 40px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      max-width: 1200px;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .page-title { font-size: 26px; font-weight: 800; color: #0d1f33; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    /* Search */
    .search-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 16px;
      margin-bottom: 24px;
      max-width: 400px;
    }
    .search-icon { font-size: 16px; }
    .search-bar input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 14px;
      color: #0d1f33;
      background: transparent;
    }
    .btn-clear {
      background: none; border: none; color: #94a3b8;
      cursor: pointer; font-size: 14px; padding: 2px 4px;
    }
    .btn-clear:hover { color: #475569; }

    /* Alert */
    .alert {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 10px; font-size: 14px; margin-bottom: 20px;
    }
    .alert-error { background: #fee2e2; color: #991b1b; }

    /* Unit cards */
    .unit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
    }
    .unit-card {
      background: white;
      border-radius: 14px;
      border: 1px solid #e8edf3;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
    }
    .unit-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    }
    .unit-top {
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .unit-emoji { font-size: 32px; }
    .type-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: 0.5px;
    }
    .unit-body { padding: 14px 18px; flex: 1; }
    .unit-name {
      font-size: 16px;
      font-weight: 700;
      color: #0d1f33;
      margin: 0 0 12px;
    }
    .unit-stats { display: flex; flex-direction: column; gap: 6px; }
    .stat {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #475569;
    }
    .stat-icon { font-size: 14px; width: 18px; text-align: center; }
    .slots { font-weight: 600; }
    .low { color: #dc2626; }

    .unit-footer {
      padding: 10px 18px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .unit-id { font-size: 11px; color: #94a3b8; }
    .avail-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 20px;
    }
    .avail-ok { background: #dcfce7; color: #166534; }
    .avail-no { background: #fee2e2; color: #991b1b; }

    /* Empty */
    .empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    .empty-state p { margin: 0; font-size: 15px; }

    /* Botones */
    .btn-primary {
      background: #1565c0; color: white; border: none; border-radius: 8px;
      padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer;
      transition: background .15s ease;
    }
    .btn-primary:hover:not(:disabled) { background: #0d47a1; }
    .btn-primary:disabled { opacity: .6; cursor: default; }

    .btn-ghost {
      background: white; color: #334155; border: 1px solid #cbd5e1; border-radius: 8px;
      padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .btn-ghost:hover:not(:disabled) { background: #f1f5f9; }
    .btn-ghost:disabled { opacity: .6; cursor: default; }
    .btn-peligro { color: #b91c1c; border-color: #fecaca; }
    .btn-peligro:hover { background: #fef2f2; }

    /* Filtros */
    .filtros {
      display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 16px 18px; margin-bottom: 20px;
    }
    .campo { display: flex; flex-direction: column; gap: 5px; }
    .campo-corto { max-width: 110px; }
    .campo-ancho { grid-column: 1 / -1; }
    .campo label { font-size: 12px; font-weight: 700; color: #475569; }
    .campo small { font-size: 11px; color: #94a3b8; }
    .campo input, .campo select, .campo textarea {
      border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 11px;
      font-size: 14px; font-family: inherit; color: #0f172a; background: white;
    }
    .campo input:focus, .campo select:focus, .campo textarea:focus {
      outline: none; border-color: #1565c0; box-shadow: 0 0 0 3px rgba(21,101,192,.12);
    }
    .campo textarea { resize: vertical; }

    /* Establecimiento y acciones en la ficha */
    .unit-hostal { font-size: 12px; color: #64748b; margin: 2px 0 10px; }
    .unit-acciones {
      display: flex; gap: 8px; padding: 0 16px 12px;
    }
    .unit-acciones button { flex: 1; }

    /* Modal */
    .modal-fondo {
      position: fixed; inset: 0; background: rgba(15,23,42,.55);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; z-index: 50;
    }
    .modal {
      background: white; border-radius: 14px; padding: 28px;
      width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 20px 50px rgba(15,23,42,.3);
    }
    .modal-titulo { font-size: 20px; font-weight: 800; color: #0d1f33; margin: 0 0 20px; }
    .form-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
    }
    .modal-acciones {
      display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;
    }

    @media (max-width: 640px) {
      .page { padding: 24px 16px; }
      .form-grid { grid-template-columns: 1fr; }
      .filtros { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class CatalogComponent implements OnInit {

  units: Unit[] = [];
  filtered: Unit[] = [];
  hostales: Hostal[] = [];
  searchTerm = '';
  error = '';

  // Busqueda por disponibilidad
  desde = '';
  hasta = '';
  huespedes: number | null = null;
  hostalFiltro: number | null = null;
  buscandoPorFechas = false;

  // Alta y edicion
  esAdmin = false;
  puedeReservar = false;
  mostrandoForm = false;
  guardando = false;
  errorForm = '';
  form: Unit = UNIDAD_VACIA();

  constructor(private svc: CatalogService, private auth: AuthService,
              private router: Router) {}

  ngOnInit() {
    // Administrar el inventario es responsabilidad del Admin, segun el caso. El Operador y el
    // Cliente ven el catalogo pero no lo modifican. Esto solo oculta los controles: quien manda
    // es el backend, que responde 403 a cualquier escritura que no venga de un Admin.
    this.esAdmin = this.auth.getRoles().includes('Admin');
    // Los tres roles que el BFF autoriza a crear reservas. El huesped reserva a su nombre y
    // recepcion a nombre de un tercero, pero el boton es el mismo.
    this.puedeReservar = this.auth.getRoles()
      .some(r => ['Admin', 'Operador', 'Cliente'].includes(r));

    this.cargarUnidades();
    this.svc.getHostales().subscribe({
      next: data => this.hostales = data,
      error: () => { /* sin establecimientos el catalogo sigue siendo legible */ }
    });
  }

  private cargarUnidades() {
    this.svc.getAll().subscribe({
      next: data => { this.units = data; this.buscandoPorFechas = false; this.applyFilter(); },
      error: () => this.error = 'No se pudo conectar con el servicio de catálogo. Verifica que el backend esté en ejecución.'
    });
  }

  typeMeta(type: string) {
    return TYPE_META[type?.toUpperCase()] ?? { icon: '🏠', color: '#1565c0', bg: '#dbeafe' };
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
      return;
    }
    if (this.desde && this.hasta && this.desde >= this.hasta) {
      this.error = 'La salida tiene que ser posterior a la entrada.';
      return;
    }

    this.svc.buscar({
      from: this.desde || undefined,
      to: this.hasta || undefined,
      huespedes: this.huespedes || undefined,
      hostalId: this.hostalFiltro || undefined
    }).subscribe({
      next: data => {
        this.units = data;
        this.buscandoPorFechas = !!(this.desde && this.hasta);
        this.applyFilter();
      },
      error: err => this.error = this.mensajeDeError(err, 'No se pudo buscar la disponibilidad.')
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

  eliminar(u: Unit) {
    // Es una baja logica: la unidad queda inactiva y sus reservas historicas siguen existiendo.
    if (!confirm('¿Retirar "' + u.name + '" del catálogo?\n\nDeja de aparecer en las búsquedas, pero sus reservas se conservan.')) {
      return;
    }
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
   * Lleva a la pantalla de reservas con esta unidad ya elegida.
   *
   * Se pasa solo el identificador por la URL, no la unidad entera: el formulario de reservas tiene
   * que comprobar de todos modos que siga teniendo cupo en las fechas que se elijan, y confiar en
   * unos datos arrastrados desde otra pantalla seria quedarse con una foto vieja del catalogo.
   */
  reservar(u: Unit) {
    if (!u.id || u.availableSlots === 0) {
      return;
    }
    this.router.navigate(['/reservations'], { queryParams: { unitId: u.id } });
  }

}
