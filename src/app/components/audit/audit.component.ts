import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditEvent, AuditService } from '../../services/audit.service';

const EVENT_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  RESERVATION_CREATED:   { label: 'Creada',        color: '#26729B', bg: '#BFE7F4', icon: '✏️' },
  RESERVATION_CONFIRMED: { label: 'Confirmada',    color: '#166534', bg: '#dcfce7', icon: '✅' },
  CHECKIN_PENDING:       { label: 'Ch-in pend.',   color: '#3A96C4', bg: '#d0ecf8', icon: '⏳' },
  CHECKIN_COMPLETED:     { label: 'Ch-in hecho',   color: '#0e7490', bg: '#cffafe', icon: '🔑' },
  CHECKOUT_COMPLETED:    { label: 'Checkout',      color: '#6b21a8', bg: '#f3e8ff', icon: '🚪' },
  RESERVATION_CANCELLED: { label: 'Cancelada',     color: '#991b1b', bg: '#fee2e2', icon: '✖️' },
};

const SEARCH_MODES = [
  { value: 'reservation', label: 'Por Reserva',         icon: '🔢', placeholder: 'ID de reserva' },
  { value: 'range',       label: 'Por Rango de Fechas', icon: '📅', placeholder: '' },
  { value: 'actor',       label: 'Por Actor',           icon: '👤', placeholder: 'ID o email del actor' },
  { value: 'type',        label: 'Por Tipo de Evento',  icon: '🏷️', placeholder: '' },
];

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Auditoría</h1>
          <p class="page-sub">Timeline y trazabilidad de eventos de reserva</p>
        </div>
      </div>

      <!-- Search card -->
      <div class="search-card">
        <p class="search-title">Buscar eventos</p>

        <!-- Mode tabs -->
        <div class="mode-tabs">
          <button *ngFor="let m of modes" class="mode-tab" [class.active]="mode === m.value"
                  (click)="mode = m.value; onModeChange()">
            <span>{{ m.icon }}</span> {{ m.label }}
          </button>
        </div>

        <!-- Inputs by mode -->
        <div class="search-row">
          <ng-container [ngSwitch]="mode">
            <input *ngSwitchCase="'reservation'"
                   type="number" placeholder="Ingresa el ID de reserva…"
                   [(ngModel)]="reservationId" (keyup.enter)="search()" />

            <ng-container *ngSwitchCase="'range'">
              <div class="date-pair">
                <div class="field-group"><label>Desde</label><input type="datetime-local" [(ngModel)]="from" /></div>
                <div class="field-group"><label>Hasta</label><input type="datetime-local" [(ngModel)]="to" /></div>
              </div>
            </ng-container>

            <input *ngSwitchCase="'actor'"
                   type="text" placeholder="ID o email del actor…"
                   [(ngModel)]="actorId" (keyup.enter)="search()" />

            <select *ngSwitchCase="'type'" [(ngModel)]="eventType">
              <option *ngFor="let k of eventKeys" [value]="k">{{ eventMeta(k).icon }} {{ eventMeta(k).label }}</option>
            </select>
          </ng-container>

          <button class="btn-search" (click)="search()">
            🔍 Buscar
          </button>
        </div>
      </div>

      <!-- Error -->
      <div class="alert alert-error" *ngIf="error">⚠️ {{ error }}</div>

      <!-- Timeline -->
      <div class="results-area" *ngIf="events.length > 0">
        <div class="results-header">
          <span class="results-count">{{ events.length }} evento{{ events.length !== 1 ? 's' : '' }}</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Evento</th>
                <th>Reserva</th>
                <th>Actor</th>
                <th>Rol</th>
                <th>Trace ID</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of events">
                <td class="date-cell">
                  <span class="date-main">{{ e.occurredAt | date:'dd/MM/yyyy' }}</span>
                  <span class="date-time">{{ e.occurredAt | date:'HH:mm:ss' }}</span>
                </td>
                <td>
                  <span class="event-badge"
                    [style.color]="eventMeta(e.eventType).color"
                    [style.background]="eventMeta(e.eventType).bg">
                    {{ eventMeta(e.eventType).icon }} {{ eventMeta(e.eventType).label }}
                  </span>
                </td>
                <td><span class="res-chip">#{{ e.reservationId }}</span></td>
                <td class="actor-cell">{{ e.actorId ?? '—' }}</td>
                <td>
                  <span class="role-pill" *ngIf="e.actorRole">{{ e.actorRole }}</span>
                  <span class="none" *ngIf="!e.actorRole">—</span>
                </td>
                <td class="trace-cell">{{ e.traceId ? (e.traceId | slice:0:12) + '…' : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty searched -->
      <div class="empty-state" *ngIf="events.length === 0 && searched && !error">
        <span class="empty-icon">📭</span>
        <p>Sin eventos para los criterios seleccionados.</p>
      </div>

      <!-- Not yet searched -->
      <div class="empty-state dimmed" *ngIf="!searched && !error">
        <span class="empty-icon">🔍</span>
        <p>Usa el buscador de arriba para consultar el historial de eventos.</p>
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

    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 26px; font-weight: 800; color: #26729B; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #4EA8D1; margin: 0; }

    /* Search card */
    .search-card {
      background: white;
      border-radius: 14px;
      border: 1px solid #BFE7F4;
      padding: 20px 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 10px rgba(38,114,155,0.06);
    }
    .search-title { font-size: 11px; font-weight: 700; color: #78C1E0; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 0.5px; }

    .mode-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }
    .mode-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid #BFE7F4;
      background: #F9F9F7;
      font-size: 13px;
      color: #4EA8D1;
      cursor: pointer;
      transition: all 0.15s;
      font-weight: 500;
    }
    .mode-tab:hover { border-color: #3A96C4; color: #3A96C4; background: white; }
    .mode-tab.active { background: #26729B; color: white; border-color: #26729B; box-shadow: 0 2px 8px rgba(38,114,155,0.3); }

    .search-row {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    input[type=number], input[type=text], input[type=datetime-local], select {
      flex: 1;
      min-width: 200px;
      padding: 10px 14px;
      border-radius: 9px;
      border: 1px solid #BFE7F4;
      font-size: 14px;
      color: #26729B;
      background: #F9F9F7;
      outline: none;
      transition: border 0.15s;
    }
    input:focus, select:focus { border-color: #3A96C4; background: white; }
    .date-pair { display: flex; gap: 12px; flex: 1; min-width: 300px; flex-wrap: wrap; }
    .field-group { display: flex; flex-direction: column; gap: 5px; flex: 1; }
    .field-group label { font-size: 11px; color: #78C1E0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }

    .btn-search {
      padding: 10px 22px;
      background: #26729B;
      color: white;
      border: none;
      border-radius: 9px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s;
      white-space: nowrap;
      box-shadow: 0 2px 10px rgba(38,114,155,0.25);
    }
    .btn-search:hover { background: #3A96C4; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(58,150,196,0.35); }

    /* Alert */
    .alert { padding: 12px 16px; border-radius: 10px; font-size: 14px; margin-bottom: 20px; }
    .alert-error { background: #fee2e2; color: #991b1b; }

    /* Results */
    .results-header {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }
    .results-count {
      font-size: 13px;
      font-weight: 700;
      color: #4EA8D1;
    }
    .table-wrap {
      background: white;
      border-radius: 14px;
      border: 1px solid #BFE7F4;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(38,114,155,0.07);
    }
    table { width: 100%; border-collapse: collapse; }
    thead { background: #F9F9F7; }
    th {
      padding: 11px 14px;
      text-align: left;
      font-size: 11px;
      color: #78C1E0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      border-bottom: 1px solid #BFE7F4;
    }
    td { padding: 12px 14px; font-size: 13px; color: #26729B; border-bottom: 1px solid #F9F9F7; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #F9F9F7; }

    .date-cell { display: flex; flex-direction: column; gap: 2px; }
    .date-main { font-weight: 600; color: #26729B; }
    .date-time { font-size: 11px; color: #78C1E0; font-family: monospace; }

    .event-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .res-chip {
      background: #BFE7F4; color: #26729B;
      padding: 2px 10px; border-radius: 20px;
      font-size: 12px; font-weight: 700;
    }
    .actor-cell { font-size: 12px; color: #4EA8D1; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .role-pill {
      background: #d0ecf8; color: #26729B;
      padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }
    .none { color: #BFE7F4; }
    .trace-cell { font-family: monospace; font-size: 11px; color: #78C1E0; }

    /* Empty */
    .empty-state { text-align: center; padding: 60px 20px; color: #4EA8D1; }
    .empty-state.dimmed { color: #78C1E0; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    .empty-state p { margin: 0; font-size: 15px; }
  `]
})
export class AuditComponent implements OnInit {

  mode = 'reservation';
  modes = SEARCH_MODES;
  reservationId: number | null = null;
  from = '';
  to = '';
  actorId = '';
  eventType = 'RESERVATION_CREATED';
  eventKeys = Object.keys(EVENT_META);

  events: AuditEvent[] = [];
  error = '';
  searched = false;

  constructor(private svc: AuditService) {}
  ngOnInit() {}

  eventMeta(type: string) {
    return EVENT_META[type] ?? { label: type, color: '#4EA8D1', bg: '#BFE7F4', icon: '📌' };
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
    obs$.subscribe({
      next: data => this.events = data,
      error: () => this.error = 'No se pudo consultar la auditoría. Verifica que el backend esté activo.'
    });
  }
}