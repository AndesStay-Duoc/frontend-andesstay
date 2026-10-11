import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Reservation, ReservationService } from '../../services/reservation.service';
import { Unit, CatalogService } from '../../services/catalog.service';
import { AuthService } from '../../services/auth.service';

// SIN TILDE, igual que el enum del backend. Llevaba EN_ESTADÍA con tilde, que ya no coincide con
// ningun valor que devuelva la API: la etiqueta caia al generico y el filtro por ese estado no
// devolvia nada.
const STATUSES = ['CREADA','CONFIRMADA','CHECKIN_PENDIENTE','EN_ESTADIA','CHECKOUT','CANCELADA'];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  CREADA:            { label: 'Creada',          color: '#854d0e', bg: '#fef9c3' },
  CONFIRMADA:        { label: 'Confirmada',       color: '#166534', bg: '#dcfce7' },
  CHECKIN_PENDIENTE: { label: 'Check-in pend.',   color: '#1e40af', bg: '#dbeafe' },
  EN_ESTADIA:        { label: 'En estadía',       color: '#0e7490', bg: '#cffafe' },
  CHECKOUT:          { label: 'Checkout',         color: '#6b21a8', bg: '#f3e8ff' },
  CANCELADA:         { label: 'Cancelada',        color: '#991b1b', bg: '#fee2e2' },
};

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <!-- Alta de reserva. La puede usar el huesped y tambien recepcion en el mostrador. -->
      <div class="modal-fondo" *ngIf="mostrandoForm" (click)="cerrarForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2 class="modal-titulo">Nueva reserva</h2>

          <div class="alert alert-error" *ngIf="errorForm"><span>⚠️</span> {{ errorForm }}</div>

          <div class="form-grid">
            <div class="campo">
              <label>Entrada *</label>
              <input type="date" [(ngModel)]="form.checkIn" name="checkIn"
                     (change)="unidadesLibres = []; form.unitId = 0" />
            </div>
            <div class="campo">
              <label>Salida *</label>
              <input type="date" [(ngModel)]="form.checkOut" name="checkOut"
                     (change)="unidadesLibres = []; form.unitId = 0" />
            </div>
            <div class="campo">
              <label>Huéspedes *</label>
              <input type="number" min="1" [(ngModel)]="form.huespedes" name="huespedes"
                     (change)="unidadesLibres = []; form.unitId = 0" />
            </div>
            <div class="campo campo-boton">
              <button class="btn-ghost" (click)="buscarUnidades()" [disabled]="buscandoUnidades">
                {{ buscandoUnidades ? 'Buscando…' : 'Buscar unidades libres' }}
              </button>
            </div>

            <div class="campo campo-ancho" *ngIf="unidadesLibres.length > 0">
              <label>Unidad *</label>
              <select [(ngModel)]="form.unitId" name="unitId">
                <option [ngValue]="0" disabled>Selecciona una unidad…</option>
                <option *ngFor="let u of unidadesLibres" [ngValue]="u.id">
                  {{ u.name }} · {{ u.capacity }} pax · {{ u.pricePerNight | currency:'CLP':'symbol':'1.0-0' }}/noche
                </option>
              </select>
              <small *ngIf="totalEstimado > 0">
                {{ noches }} noche{{ noches !== 1 ? 's' : '' }} ·
                total estimado {{ totalEstimado | currency:'CLP':'symbol':'1.0-0' }}
              </small>
            </div>

            <div class="campo campo-ancho" *ngIf="busquedaHecha && unidadesLibres.length === 0">
              <p class="sin-unidades">
                No hay unidades libres todas las noches de ese rango con esa capacidad.
                Prueba con otras fechas.
              </p>
            </div>

            <!-- Recepcion reserva a nombre de un tercero; el huesped, a su propio nombre, y el
                 backend fuerza sus datos desde el token aunque aqui se escriba otra cosa. -->
            <div class="campo campo-ancho" *ngIf="!esCliente">
              <label>Correo del huésped *</label>
              <input type="email" [(ngModel)]="form.guestEmail" name="guestEmail"
                     placeholder="huesped@example.cl" />
            </div>
          </div>

          <div class="modal-acciones">
            <button class="btn-ghost" (click)="cerrarForm()" [disabled]="guardando">Cancelar</button>
            <button class="btn-primary" (click)="guardar()"
                    [disabled]="guardando || !form.unitId">
              {{ guardando ? 'Creando…' : 'Crear reserva' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Gestión de Reservas</h1>
          <p class="page-sub">
            {{ reservations.length }} resultado{{ reservations.length !== 1 ? 's' : '' }}
            <span *ngIf="esCliente"> · solo las tuyas</span>
          </p>
        </div>
        <button class="btn-primary" *ngIf="puedeReservar" (click)="nuevaReserva()">
          ＋ Nueva reserva
        </button>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>Estado</label>
          <select [(ngModel)]="filterStatus" (change)="load()">
            <option value="">Todos</option>
            <option *ngFor="let s of statuses" [value]="s">{{ meta(s).label }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Desde</label>
          <input type="date" [(ngModel)]="filterFrom" (change)="load()" />
        </div>
        <div class="filter-group">
          <label>Hasta</label>
          <input type="date" [(ngModel)]="filterTo" (change)="load()" />
        </div>
        <button class="btn-clear" *ngIf="filterStatus || filterFrom || filterTo"
                (click)="clearFilters()">✕ Limpiar</button>
      </div>

      <!-- Error -->
      <div class="alert alert-error" *ngIf="error">
        <span>⚠️</span> {{ error }}
      </div>

      <!-- Table -->
      <div class="table-wrap" *ngIf="reservations.length > 0">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Unidad</th>
              <th>Huésped</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Huéspedes</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of reservations">
              <td class="id-cell">{{ r.id }}</td>
              <td><span class="unit-badge">Unidad {{ r.unitId }}</span></td>
              <td class="guest-cell">{{ r.guestEmail }}</td>
              <td>{{ r.checkIn | date:'dd MMM yyyy':'':'es-CL' }}</td>
              <td>{{ r.checkOut | date:'dd MMM yyyy':'':'es-CL' }}</td>
              <td>{{ r.huespedes ?? '—' }}</td>
              <td>{{ r.totalPrice != null ? (r.totalPrice | currency:'CLP':'symbol':'1.0-0') : '—' }}</td>
              <td>
                <span class="status-badge"
                  [style.color]="meta(r.status ?? '').color"
                  [style.background]="meta(r.status ?? '').bg">
                  {{ meta(r.status ?? '').label }}
                </span>
              </td>
              <td>
                <!-- Recepcion y administracion operan cualquier transicion -->
                <select class="action-select" *ngIf="!esCliente && enCurso(r)"
                  (change)="changeStatus(r, $any($event.target).value)">
                  <option value="">Cambiar…</option>
                  <option *ngFor="let s of statuses" [value]="s">{{ meta(s).label }}</option>
                </select>

                <!-- El huesped solo puede cancelar, y solo mientras siga en CREADA.
                     Es la transicion 3 y la regla 5 del contrato de estados. -->
                <button class="btn-ghost btn-peligro" *ngIf="esCliente && r.status === 'CREADA'"
                        (click)="cancelar(r)">
                  Cancelar
                </button>

                <span class="final-label"
                      *ngIf="!enCurso(r) || (esCliente && r.status !== 'CREADA')">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div class="empty-state" *ngIf="reservations.length === 0 && !error">
        <span class="empty-icon">📭</span>
        <p>Sin reservas para los filtros seleccionados.</p>
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
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .page-title { font-size: 26px; font-weight: 800; color: #0d1f33; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    /* Filter bar */
    .filter-bar {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
      background: white;
      border: 1px solid #e8edf3;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .filter-group { display: flex; flex-direction: column; gap: 5px; }
    .filter-group label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    select, input[type=date] {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-size: 13px;
      color: #0d1f33;
      background: #f8fafc;
      cursor: pointer;
      min-width: 140px;
    }
    select:focus, input:focus { outline: none; border-color: #1976d2; background: white; }
    .btn-clear {
      padding: 8px 14px;
      background: #fee2e2;
      color: #991b1b;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-clear:hover { background: #fecaca; }

    /* Alert */
    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .alert-error { background: #fee2e2; color: #991b1b; }

    /* Table */
    .table-wrap {
      background: white;
      border-radius: 14px;
      border: 1px solid #e8edf3;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    }
    table { width: 100%; border-collapse: collapse; }
    thead { background: #f8fafc; }
    th {
      padding: 12px 16px;
      text-align: left;
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      border-bottom: 1px solid #e8edf3;
    }
    td {
      padding: 13px 16px;
      font-size: 13px;
      color: #334155;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #f8fafc; }

    .id-cell { font-weight: 700; color: #0d1f33; font-size: 14px; }
    .unit-badge {
      background: #e8f4fd;
      color: #1565c0;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .guest-cell { color: #475569; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .action-select {
      min-width: 130px;
      padding: 6px 10px;
      border-radius: 7px;
      font-size: 12px;
      cursor: pointer;
    }
    .final-label { color: #cbd5e1; font-size: 18px; }

    /* Empty */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #94a3b8;
    }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    .empty-state p { margin: 0; font-size: 15px; }

    /* Botones */
    .btn-primary {
      background: #1565c0; color: white; border: none; border-radius: 8px;
      padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer;
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
    .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .modal-acciones { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }

    .campo { display: flex; flex-direction: column; gap: 5px; }
    .campo-ancho { grid-column: 1 / -1; }
    .campo-boton { grid-column: 1 / -1; align-items: flex-start; }
    .campo label { font-size: 12px; font-weight: 700; color: #475569; }
    .campo small { font-size: 12px; color: #1565c0; font-weight: 600; }
    .campo input, .campo select {
      border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 11px;
      font-size: 14px; font-family: inherit; color: #0f172a; background: white;
    }
    .campo input:focus, .campo select:focus {
      outline: none; border-color: #1565c0; box-shadow: 0 0 0 3px rgba(21,101,192,.12);
    }
    .sin-unidades {
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
      padding: 12px 14px; font-size: 13px; color: #92400e; margin: 0;
    }

    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ReservationsComponent implements OnInit {

  reservations: Reservation[] = [];
  statuses = STATUSES;
  filterStatus = '';
  filterFrom = '';
  filterTo = '';
  error = '';

  esCliente = false;
  puedeReservar = false;

  // Alta de reserva
  mostrandoForm = false;
  guardando = false;
  buscandoUnidades = false;
  busquedaHecha = false;
  errorForm = '';
  unidadesLibres: Unit[] = [];
  form: Reservation = this.reservaVacia();

  constructor(private svc: ReservationService,
              private catalogo: CatalogService,
              private auth: AuthService) {}

  ngOnInit() {
    const roles = this.auth.getRoles();
    // Un Cliente recibe SOLO sus reservas: el filtro lo aplica el backend con el sub de su token,
    // no un parametro, asi que no puede pedir las de otro.
    this.esCliente = roles.includes('Cliente') && !roles.includes('Admin') && !roles.includes('Operador');
    this.puedeReservar = roles.some(r => ['Admin', 'Operador', 'Cliente'].includes(r));
    this.load();
  }

  meta(status: string) {
    return STATUS_META[status] ?? { label: status, color: '#475569', bg: '#f1f5f9' };
  }

  /** Una reserva en CHECKOUT o CANCELADA es terminal: de ahi no sale ninguna transicion. */
  enCurso(r: Reservation): boolean {
    return r.status != null && r.status !== 'CHECKOUT' && r.status !== 'CANCELADA';
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
    this.svc.changeStatus(r.id, newStatus).subscribe({
      next: updated => r.status = updated.status,
      error: err => this.error = this.mensajeDeError(err, 'No se pudo cambiar el estado de la reserva.')
    });
  }

  cancelar(r: Reservation) {
    if (!confirm('¿Cancelar la reserva #' + r.id + '?')) {
      return;
    }
    this.changeStatus(r, 'CANCELADA');
  }

  // ── Alta ──────────────────────────────────────────────────────────────────

  nuevaReserva() {
    this.form = this.reservaVacia();
    this.unidadesLibres = [];
    this.busquedaHecha = false;
    this.errorForm = '';
    this.mostrandoForm = true;
  }

  cerrarForm() {
    if (this.guardando) return;
    this.mostrandoForm = false;
    this.errorForm = '';
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
    if (!this.esCliente && !this.form.guestEmail?.trim()) {
      this.errorForm = 'Indica el correo del huésped.';
      return;
    }

    this.guardando = true;
    this.errorForm = '';
    this.svc.create(this.form).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrandoForm = false;
        this.load();
      },
      error: err => {
        this.guardando = false;
        this.errorForm = this.mensajeDeError(err, 'No se pudo crear la reserva.');
      }
    });
  }

  private reservaVacia(): Reservation {
    // Por omision, entrada mañana y dos noches: son las fechas que el formulario propone y
    // evitan el error de intentar reservar en el pasado.
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const manana = new Date(Date.now() + 86400000);
    const pasado = new Date(Date.now() + 3 * 86400000);
    return {
      unitId: 0,
      checkIn: iso(manana),
      checkOut: iso(pasado),
      huespedes: 2,
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
