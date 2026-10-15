import { Component, OnInit } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditEvent, AuditService } from '../../services/audit.service';
import { IconoComponent } from '../../shared/icono/icono.component';
import { FondoComponent } from '../../shared/fondo/fondo.component';

// Las claves son los eventType que de verdad guarda ms-andesstay-audit: reservations publica
// "CREATED" al crear y el nombre del NUEVO estado en cada transicion (ReservationStatus.name()).
// Antes decian RESERVATION_CREATED, RESERVATION_CONFIRMED…, que no existen en ningun sitio:
// la busqueda por tipo no encontraba nada y cada fila mostraba el codigo crudo.
// `estado` reutiliza el distintivo de color del estado de reserva correspondiente.
const EVENT_META: Record<string, { label: string; estado: string; icon: string }> = {
  CREATED:           { label: 'Reserva creada',     estado: 'CREADA',            icon: 'add_circle' },
  CONFIRMADA:        { label: 'Confirmada',         estado: 'CONFIRMADA',        icon: 'check_circle' },
  CHECKIN_PENDIENTE: { label: 'Check-in pendiente', estado: 'CHECKIN_PENDIENTE', icon: 'key' },
  EN_ESTADIA:        { label: 'En estadía',         estado: 'EN_ESTADIA',        icon: 'cottage' },
  CHECKOUT:          { label: 'Checkout',           estado: 'CHECKOUT',          icon: 'done_all' },
  CANCELADA:         { label: 'Cancelada',          estado: 'CANCELADA',         icon: 'cancel' },
};

// Eventos anteriores al cambio del enum a EN_ESTADIA sin tilde quedaron guardados con la tilde.
// Se etiquetan igual, pero no se ofrecen en el filtro: el valor vigente es el de EVENT_META.
const EVENT_META_HEREDADO: typeof EVENT_META = {
  'EN_ESTADÍA': EVENT_META['EN_ESTADIA'],
};

const SEARCH_MODES = [
  { value: 'reservation', label: 'Por reserva',         icon: 'tag' },
  { value: 'range',       label: 'Por rango de fechas', icon: 'date_range' },
  { value: 'actor',       label: 'Por actor',           icon: 'person_search' },
  { value: 'type',        label: 'Por tipo de evento',  icon: 'label' },
];

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [DatePipe, SlicePipe, FormsModule, IconoComponent, FondoComponent],
  template: `
    <div class="cabecera">
      <h1>Auditoría</h1>
      <p class="sub">Línea de tiempo y trazabilidad de los eventos de reserva: quién hizo qué y cuándo.</p>
    </div>

    <form class="tarjeta buscador" (ngSubmit)="search()" novalidate>
      <div class="modos" role="tablist" aria-label="Tipo de búsqueda">
        @for (m of modes; track m.value) {
          <button type="button" role="tab" class="modo" [class.activo]="mode === m.value" [attr.aria-selected]="mode === m.value"
                  (click)="mode = m.value; onModeChange()">
            <app-icono [nombre]="m.icon" [tamano]="18" />{{ m.label }}
          </button>
        }
      </div>

      <div class="campos">
        @switch (mode) {
          @case ('reservation') {
            <div class="campo"><label for="a-res">ID de reserva</label>
              <div class="control"><app-icono nombre="tag" /><input id="a-res" type="number" name="reservationId" [(ngModel)]="reservationId" /></div></div>
          }
          @case ('range') {
            <div class="campo"><label for="a-desde">Desde</label>
              <div class="control"><input id="a-desde" type="datetime-local" name="from" [(ngModel)]="from" /></div></div>
            <div class="campo"><label for="a-hasta">Hasta</label>
              <div class="control"><input id="a-hasta" type="datetime-local" name="to" [(ngModel)]="to" /></div></div>
          }
          @case ('actor') {
            <div class="campo"><label for="a-actor">ID o correo del actor</label>
              <div class="control"><app-icono nombre="person" /><input id="a-actor" type="text" name="actorId" [(ngModel)]="actorId" /></div></div>
          }
          @case ('type') {
            <div class="campo"><label for="a-tipo">Tipo de evento</label>
              <div class="control"><select id="a-tipo" name="eventType" [(ngModel)]="eventType">
                @for (k of eventKeys; track k) { <option [value]="k">{{ eventMeta(k).label }}</option> }
              </select></div></div>
          }
        }
        <button type="submit" class="btn btn-primario" [disabled]="buscando">
          <app-icono nombre="search" />{{ buscando ? 'Buscando…' : 'Buscar' }}
        </button>
      </div>
    </form>

    @if (error) {
      <div class="aviso aviso-error" role="alert"><app-icono nombre="error" [tamano]="22" /><div>{{ error }}</div></div>
    }

    @if (events.length > 0) {
      <p class="conteo" aria-live="polite">{{ events.length }} {{ events.length === 1 ? 'evento' : 'eventos' }}</p>

      @if (mode === 'reservation') {
        <!-- Una sola reserva: su historia como línea de tiempo -->
        <ol class="tarjeta linea">
          @for (e of events; track e.eventId) {
            <li>
              <span class="nodo" [class]="'nodo estado-' + eventMeta(e.eventType).estado"><app-icono [nombre]="eventMeta(e.eventType).icon" [tamano]="18" /></span>
              <div>
                <b>{{ eventMeta(e.eventType).label }}</b>
                <span class="cuando">{{ e.occurredAt | date:'d MMM y, HH:mm:ss' }}</span>
                <span class="quien">{{ e.actorId ?? '—' }}@if (e.actorRole) { · {{ e.actorRole }} }@if (e.traceId) { · trace {{ e.traceId | slice:0:12 }}… }</span>
              </div>
            </li>
          }
        </ol>
      } @else {
        <div class="tarjeta tabla">
          <table>
            <thead><tr><th>Fecha / hora</th><th>Evento</th><th>Reserva</th><th>Actor</th><th>Rol</th><th>Trace ID</th></tr></thead>
            <tbody>
              @for (e of events; track e.eventId) {
                <tr>
                  <td><span class="fecha">{{ e.occurredAt | date:'dd/MM/yyyy' }}</span><span class="hora">{{ e.occurredAt | date:'HH:mm:ss' }}</span></td>
                  <td><span [class]="'estado estado-' + eventMeta(e.eventType).estado"><app-icono [nombre]="eventMeta(e.eventType).icon" [tamano]="17" />{{ eventMeta(e.eventType).label }}</span></td>
                  <td class="num">#{{ e.reservationId }}</td>
                  <td class="actor">{{ e.actorId ?? '—' }}</td>
                  <td>{{ e.actorRole ?? '—' }}</td>
                  <td class="trace">{{ e.traceId ? (e.traceId | slice:0:12) + '…' : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    @if (events.length === 0 && !error && !buscando) {
      <div class="tarjeta vacio">
        <div class="vacio-arte" aria-hidden="true"><app-fondo region="elipses" /></div>
        <div class="vacio-txt">
          @if (searched) {
            <h2>Sin eventos para los criterios seleccionados</h2>
            <p>Prueba con otro criterio o con un rango de fechas más amplio.</p>
          } @else {
            <h2>Busca en el historial</h2>
            <p>Elige un tipo de búsqueda arriba para consultar los eventos de reserva.</p>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .cabecera { margin-bottom: 18px; }
    h1 { font-size: clamp(28px, 4vw, 38px); }
    .sub, .vacio-txt p, .conteo { color: var(--text-muted); }

    .buscador { padding: 16px; margin-bottom: 18px; }
    .modos { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .modo { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; cursor: pointer;
      border: 1.5px solid var(--border); background: var(--surface); font-weight: 700; font-size: 14px; }
    .modo:hover { border-color: var(--c-petroleo); }
    .modo.activo { background: var(--c-petroleo); border-color: var(--c-petroleo); color: var(--c-crema); }
    .campos { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
    .campos .campo { flex: 1; min-width: 200px; max-width: 360px; }
    .campos .btn { height: 48px; }

    .aviso { margin-bottom: 18px; }
    .conteo { margin-bottom: 10px; font-weight: 700; }

    .tabla { overflow-x: auto; }
    table { width: 100%; min-width: 820px; border-collapse: collapse; }
    th { padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
      color: var(--text-muted); background: var(--surface-sutil); border-bottom: 1px solid var(--border); }
    td { padding: 12px 14px; font-size: 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tbody tr:last-child td { border-bottom: 0; }
    .fecha { display: block; font-weight: 700; }
    .hora, .trace { font-family: ui-monospace, monospace; font-size: 12px; color: var(--text-muted); }
    .num { font-weight: 700; }
    .actor { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .linea { display: grid; padding: 18px 20px; list-style: none; }
    .linea li { position: relative; display: flex; gap: 14px; padding-bottom: 18px; }
    .linea li:last-child { padding-bottom: 0; }
    .linea li:not(:last-child)::before { content: ''; position: absolute; left: 17px; top: 36px; bottom: 0; width: 2px; background: var(--border); }
    .nodo { display: grid; place-items: center; flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; padding: 0; }
    .linea b { display: block; }
    .cuando, .quien { display: block; font-size: 13px; color: var(--text-muted); overflow-wrap: anywhere; }

    .vacio { display: grid; grid-template-columns: 160px 1fr; overflow: hidden; }
    .vacio-arte { position: relative; min-height: 160px; }
    .vacio-txt { display: flex; flex-direction: column; justify-content: center; gap: 8px; padding: 20px; }
    .vacio-txt h2 { font-size: 21px; }

    @media (max-width: 640px) {
      .campos .campo { max-width: none; }
      .campos .btn { width: 100%; }
      .vacio { grid-template-columns: 1fr; }
      .vacio-arte { min-height: 110px; }
    }
  `]
})
export class AuditComponent implements OnInit {

  mode = 'reservation';
  modes = SEARCH_MODES;
  reservationId: number | null = null;
  from = '';
  to = '';
  actorId = '';
  eventType = 'CREATED';
  eventKeys = Object.keys(EVENT_META);

  events: AuditEvent[] = [];
  error = '';
  searched = false;
  /** Hay una consulta en curso. */
  buscando = false;

  constructor(private svc: AuditService) {}
  ngOnInit() {}

  eventMeta(type: string) {
    return EVENT_META[type] ?? EVENT_META_HEREDADO[type]
      ?? { label: type, estado: 'CHECKOUT', icon: 'radio_button_checked' };
  }

  onModeChange() { this.events = []; this.searched = false; this.error = ''; }

  search() {
    this.error = '';
    this.searched = true;
    let obs$;
    switch (this.mode) {
      case 'reservation':
        if (!this.reservationId) { this.error = 'Ingresa un ID de reserva.'; return; }
        obs$ = this.svc.getTimeline(this.reservationId);
        break;
      case 'range':
        obs$ = this.svc.getEvents(this.from || undefined, this.to || undefined);
        break;
      case 'actor':
        if (!this.actorId.trim()) { this.error = 'Ingresa un Actor ID.'; return; }
        obs$ = this.svc.getByActor(this.actorId.trim());
        break;
      case 'type':
        obs$ = this.svc.getByType(this.eventType);
        break;
      default: return;
    }
    this.buscando = true;
    obs$.subscribe({
      next: data => { this.events = data; this.buscando = false; },
      error: () => {
        this.error = 'No se pudo consultar la auditoría. Verifica que el backend esté activo.';
        this.buscando = false;
      }
    });
  }
}
