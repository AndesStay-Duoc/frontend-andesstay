import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Reservation, ReservationService } from '../../services/reservation.service';

const STATUSES = ['CREADA','CONFIRMADA','CHECKIN_PENDIENTE','EN_ESTADÍA','CHECKOUT','CANCELADA'];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  CREADA:            { label: 'Creada',          color: '#854d0e', bg: '#fef9c3' },
  CONFIRMADA:        { label: 'Confirmada',       color: '#166534', bg: '#dcfce7' },
  CHECKIN_PENDIENTE: { label: 'Check-in pend.',   color: '#1e40af', bg: '#dbeafe' },
  'EN_ESTADÍA':      { label: 'En estadía',       color: '#0e7490', bg: '#cffafe' },
  CHECKOUT:          { label: 'Checkout',         color: '#6b21a8', bg: '#f3e8ff' },
  CANCELADA:         { label: 'Cancelada',        color: '#991b1b', bg: '#fee2e2' },
};

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Gestión de Reservas</h1>
          <p class="page-sub">{{ reservations.length }} resultado{{ reservations.length !== 1 ? 's' : '' }} encontrado{{ reservations.length !== 1 ? 's' : '' }}</p>
        </div>
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
              <td>
                <span class="status-badge"
                  [style.color]="meta(r.status ?? '').color"
                  [style.background]="meta(r.status ?? '').bg">
                  {{ meta(r.status ?? '').label }}
                </span>
              </td>
              <td>
                <select class="action-select"
                  (change)="changeStatus(r, $any($event.target).value)"
                  *ngIf="r.status != null && r.status !== 'CHECKOUT' && r.status !== 'CANCELADA'">
                  <option value="">Cambiar…</option>
                  <option *ngFor="let s of statuses" [value]="s">{{ meta(s).label }}</option>
                </select>
                <span class="final-label" *ngIf="r.status == null || r.status === 'CHECKOUT' || r.status === 'CANCELADA'">
                  —
                </span>
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
  `]
})
export class ReservationsComponent implements OnInit {

  reservations: Reservation[] = [];
  statuses = STATUSES;
  filterStatus = '';
  filterFrom = '';
  filterTo = '';
  error = '';

  constructor(private svc: ReservationService) {}

  ngOnInit() { this.load(); }

  meta(status: string) {
    return STATUS_META[status] ?? { label: status, color: '#475569', bg: '#f1f5f9' };
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
    this.svc.changeStatus(r.id, newStatus).subscribe({
      next: updated => r.status = updated.status,
      error: () => this.error = 'Error al cambiar el estado de la reserva.'
    });
  }
}