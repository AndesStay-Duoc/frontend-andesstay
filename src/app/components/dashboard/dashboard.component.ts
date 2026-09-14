import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReservationService, Reservation } from '../../services/reservation.service';
import { CatalogService, Unit } from '../../services/catalog.service';
import { forkJoin } from 'rxjs';

interface QuickCard {
  icon: string;
  label: string;
  desc: string;
  route: string;
  accent: string;
  roles: string[];
}

const TYPE_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  CABAÑA:  { icon: '🏡', label: 'Cabañas',  color: '#26729B', bg: '#BFE7F4' },
  HOSTAL:  { icon: '🏨', label: 'Hostales', color: '#3A96C4', bg: '#d0ecf8' },
  SUITE:   { icon: '🛎️', label: 'Suites',   color: '#4EA8D1', bg: '#e0f5fe' },
  DORM:    { icon: '🛏️', label: 'Dorms',    color: '#78C1E0', bg: '#eaf8fd' },
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">

      <!-- Page header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Panel principal</h1>
          <p class="page-sub">{{ today }}</p>
        </div>
        <div class="period-badge">
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5C3.89 3 3 3.9 3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
          </svg>
          Semana actual
        </div>
      </div>

      <!-- KPI cards -->
      <div class="kpi-row">
        <div class="kpi-card" style="--accent:#26729B;--bg:#BFE7F4">
          <div class="kpi-icon-wrap" style="background:var(--bg)">🏨</div>
          <div class="kpi-body">
            <p class="kpi-label">Reservas activas</p>
            <p class="kpi-val" *ngIf="kpiLoaded">{{ activeCount }}</p>
            <div class="kpi-skeleton" *ngIf="!kpiLoaded"></div>
          </div>
        </div>
        <div class="kpi-card" style="--accent:#3A96C4;--bg:#d0ecf8">
          <div class="kpi-icon-wrap" style="background:var(--bg)">📥</div>
          <div class="kpi-body">
            <p class="kpi-label">Llegadas hoy</p>
            <p class="kpi-val" *ngIf="kpiLoaded">{{ arrivingCount }}</p>
            <div class="kpi-skeleton" *ngIf="!kpiLoaded"></div>
          </div>
        </div>
        <div class="kpi-card" style="--accent:#4EA8D1;--bg:#e0f5fe">
          <div class="kpi-icon-wrap" style="background:var(--bg)">🏠</div>
          <div class="kpi-body">
            <p class="kpi-label">Unidades disponibles</p>
            <p class="kpi-val" *ngIf="kpiLoaded">{{ availableUnits }}</p>
            <div class="kpi-skeleton" *ngIf="!kpiLoaded"></div>
          </div>
        </div>
        <div class="kpi-card" style="--accent:#78C1E0;--bg:#eaf8fd">
          <div class="kpi-icon-wrap" style="background:var(--bg)">📊</div>
          <div class="kpi-body">
            <p class="kpi-label">Total unidades</p>
            <p class="kpi-val" *ngIf="kpiLoaded">{{ totalUnits }}</p>
            <div class="kpi-skeleton" *ngIf="!kpiLoaded"></div>
          </div>
        </div>
      </div>

      <!-- Two-col content -->
      <div class="two-col">

        <!-- Left: Arriving today -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Llegadas de hoy</span>
            <a routerLink="/reservations" class="panel-link">Ver todas →</a>
          </div>

          <div class="arrivals-list" *ngIf="arrivals.length > 0">
            <div class="arrival-row" *ngFor="let r of arrivals">
              <div class="arrival-icon">🔑</div>
              <div class="arrival-body">
                <span class="arrival-guest">{{ r.guestEmail }}</span>
                <span class="arrival-unit">Unidad {{ r.unitId }}</span>
              </div>
              <div class="arrival-right">
                <span class="arrival-date">{{ r.checkIn | date:'dd MMM':'':'es-CL' }}</span>
                <span class="arrival-badge">Check-in</span>
              </div>
            </div>
          </div>

          <div class="empty-arrivals" *ngIf="arrivals.length === 0 && kpiLoaded">
            <span>📭</span>
            <p>Sin llegadas programadas para hoy</p>
          </div>

          <div class="skeleton-rows" *ngIf="!kpiLoaded">
            <div class="sk-row" *ngFor="let i of [1,2,3]"></div>
          </div>
        </div>

        <!-- Right: Unit overview + quick access -->
        <div class="right-col">

          <!-- Unit type snapshot -->
          <div class="panel unit-snapshot">
            <div class="panel-header">
              <span class="panel-title">Estado del catálogo</span>
              <a routerLink="/catalog" class="panel-link">Ver catálogo →</a>
            </div>
            <div class="unit-types" *ngIf="unitsByType.length > 0">
              <div class="unit-type-row" *ngFor="let t of unitsByType">
                <span class="ut-icon">{{ typeMeta(t.type).icon }}</span>
                <div class="ut-body">
                  <span class="ut-label">{{ typeMeta(t.type).label }}</span>
                  <div class="ut-bar-wrap">
                    <div class="ut-bar-fill"
                      [style.width]="(t.available / t.total * 100) + '%'"
                      [style.background]="typeMeta(t.type).color">
                    </div>
                  </div>
                </div>
                <div class="ut-counts">
                  <span class="ut-avail" [style.color]="typeMeta(t.type).color">{{ t.available }}</span>
                  <span class="ut-sep">/</span>
                  <span class="ut-total">{{ t.total }}</span>
                </div>
              </div>
            </div>
            <div class="empty-arrivals" *ngIf="unitsByType.length === 0 && kpiLoaded">
              <span>🏚️</span>
              <p>Sin unidades registradas</p>
            </div>
            <div class="skeleton-rows" *ngIf="!kpiLoaded">
              <div class="sk-row" *ngFor="let i of [1,2,3,4]"></div>
            </div>
          </div>

          <!-- Quick access -->
          <div class="quick-access">
            <ng-container *ngFor="let c of quickCards">
              <a *ngIf="canSee(c)" [routerLink]="c.route" class="qa-card" [style.--a]="c.accent">
                <span class="qa-icon">{{ c.icon }}</span>
                <div>
                  <p class="qa-label">{{ c.label }}</p>
                  <p class="qa-desc">{{ c.desc }}</p>
                </div>
              </a>
            </ng-container>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }

    .page {
      padding: 28px 32px;
      font-family: 'Nunito', 'Segoe UI', system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .page-title { font-size: 24px; font-weight: 800; color: #26729B; margin: 0 0 3px; }
    .page-sub { font-size: 13px; color: #78C1E0; margin: 0; font-weight: 600; }
    .period-badge {
      display: flex;
      align-items: center;
      gap: 7px;
      background: #F9F9F7;
      border: 1px solid #BFE7F4;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      color: #3A96C4;
      cursor: default;
    }

    /* KPI row */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 16px;
    }
    .kpi-card {
      background: white;
      border-radius: 14px;
      border: 1px solid #BFE7F4;
      padding: 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 2px 10px rgba(38,114,155,0.06);
      border-top: 3px solid var(--accent);
      transition: all 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(38,114,155,0.12); }
    .kpi-icon-wrap {
      width: 46px; height: 46px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }
    .kpi-body { flex: 1; min-width: 0; }
    .kpi-label { font-size: 12px; color: #78C1E0; margin: 0 0 4px; font-weight: 600; }
    .kpi-val { font-size: 28px; font-weight: 800; color: #26729B; margin: 0; line-height: 1; }
    .kpi-skeleton { height: 28px; background: #BFE7F4; border-radius: 6px; animation: pulse 1.4s infinite; }

    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* Two col */
    .two-col {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

    .right-col { display: flex; flex-direction: column; gap: 16px; }

    /* Panel */
    .panel {
      background: white;
      border-radius: 14px;
      border: 1px solid #BFE7F4;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(38,114,155,0.06);
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid #BFE7F4;
      background: #F9F9F7;
    }
    .panel-title { font-size: 13px; font-weight: 800; color: #26729B; }
    .panel-link { font-size: 12px; font-weight: 700; color: #3A96C4; text-decoration: none; }
    .panel-link:hover { color: #26729B; }

    /* Arrivals list */
    .arrivals-list { display: flex; flex-direction: column; }
    .arrival-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 18px;
      border-bottom: 1px solid #F9F9F7;
      transition: background 0.15s;
    }
    .arrival-row:last-child { border-bottom: none; }
    .arrival-row:hover { background: #F9F9F7; }
    .arrival-icon {
      font-size: 20px;
      width: 36px; height: 36px;
      background: #BFE7F4;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .arrival-body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .arrival-guest { font-size: 13px; font-weight: 700; color: #26729B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .arrival-unit { font-size: 11px; color: #78C1E0; font-weight: 600; }
    .arrival-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
    .arrival-date { font-size: 11px; color: #4EA8D1; font-weight: 600; }
    .arrival-badge {
      font-size: 10px; font-weight: 700;
      padding: 2px 8px; border-radius: 10px;
      background: #dcfce7; color: #166534;
    }

    .empty-arrivals { padding: 28px 18px; text-align: center; color: #78C1E0; font-size: 13px; }
    .empty-arrivals span { font-size: 28px; display: block; margin-bottom: 6px; }
    .empty-arrivals p { margin: 0; font-weight: 600; }

    .skeleton-rows { padding: 10px 18px; display: flex; flex-direction: column; gap: 10px; }
    .sk-row { height: 44px; background: #BFE7F4; border-radius: 10px; animation: pulse 1.4s infinite; }

    /* Unit type snapshot */
    .unit-snapshot {}
    .unit-types { padding: 12px 18px; display: flex; flex-direction: column; gap: 12px; }
    .unit-type-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ut-icon { font-size: 20px; flex-shrink: 0; }
    .ut-body { flex: 1; display: flex; flex-direction: column; gap: 5px; }
    .ut-label { font-size: 12px; font-weight: 700; color: #26729B; }
    .ut-bar-wrap { height: 6px; background: #BFE7F4; border-radius: 3px; overflow: hidden; }
    .ut-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
    .ut-counts { display: flex; align-items: baseline; gap: 2px; flex-shrink: 0; }
    .ut-avail { font-size: 14px; font-weight: 800; }
    .ut-sep { font-size: 11px; color: #BFE7F4; }
    .ut-total { font-size: 11px; color: #78C1E0; font-weight: 600; }

    /* Quick access */
    .quick-access {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .qa-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #BFE7F4;
      padding: 14px;
      text-decoration: none;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      box-shadow: 0 2px 8px rgba(38,114,155,0.05);
      transition: all 0.18s;
      border-bottom: 3px solid var(--a);
    }
    .qa-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(38,114,155,0.12); border-color: var(--a); }
    .qa-icon { font-size: 20px; margin-top: 2px; flex-shrink: 0; }
    .qa-label { font-size: 12px; font-weight: 800; color: #26729B; margin: 0 0 2px; }
    .qa-desc { font-size: 10px; color: #78C1E0; margin: 0; font-weight: 600; line-height: 1.4; }
  `]
})
export class DashboardComponent implements OnInit {

  today = '';
  kpiLoaded = false;
  activeCount = 0;
  arrivingCount = 0;
  availableUnits = 0;
  totalUnits = 0;
  arrivals: Reservation[] = [];
  unitsByType: { type: string; total: number; available: number }[] = [];
  private roles: string[] = [];

  quickCards: QuickCard[] = [
    { icon: '📋', label: 'Reservas',   desc: 'Gestionar y cambiar estados',   route: '/reservations', accent: '#3A96C4', roles: ['Admin','Operador','Cliente'] },
    { icon: '🏘️', label: 'Catálogo',   desc: 'Unidades y disponibilidad',     route: '/catalog',      accent: '#4EA8D1', roles: ['Admin','Operador'] },
    { icon: '📊', label: 'Reportería', desc: 'KPIs y métricas de ocupación',  route: '/reports',      accent: '#26729B', roles: ['Admin'] },
    { icon: '🔍', label: 'Auditoría',  desc: 'Trazabilidad de eventos',       route: '/audit',        accent: '#78C1E0', roles: ['Admin','Auditor'] },
  ];

  constructor(
    private auth: AuthService,
    private reservationSvc: ReservationService,
    private catalogSvc: CatalogService
  ) {}

  ngOnInit() {
    this.roles = this.auth.getRoles();

    const now = new Date();
    this.today = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    this.today = this.today.charAt(0).toUpperCase() + this.today.slice(1);

    const todayStr = now.toISOString().split('T')[0];

    forkJoin({
      allReservations: this.reservationSvc.getAll(),
      todayArrivals: this.reservationSvc.getAll('CHECKIN_PENDIENTE', todayStr, todayStr),
      units: this.catalogSvc.getAll()
    }).subscribe({
      next: ({ allReservations, todayArrivals, units }) => {
        this.activeCount = allReservations.filter(
          r => r.status && !['CHECKOUT','CANCELADA'].includes(r.status)
        ).length;
        this.arrivals = todayArrivals.slice(0, 5);
        this.arrivingCount = todayArrivals.length;
        this.totalUnits = units.length;
        this.availableUnits = units.filter(u => u.availableSlots > 0).length;
        this.buildUnitsByType(units);
        this.kpiLoaded = true;
      },
      error: () => { this.kpiLoaded = true; }
    });
  }

  buildUnitsByType(units: Unit[]) {
    const map: Record<string, { total: number; available: number }> = {};
    for (const u of units) {
      const t = u.type?.toUpperCase() ?? 'OTRO';
      if (!map[t]) map[t] = { total: 0, available: 0 };
      map[t].total++;
      if (u.availableSlots > 0) map[t].available++;
    }
    this.unitsByType = Object.entries(map).map(([type, v]) => ({ type, ...v }));
  }

  typeMeta(type: string) {
    return TYPE_META[type] ?? { icon: '🏠', label: type, color: '#4EA8D1', bg: '#BFE7F4' };
  }

  canSee(card: QuickCard): boolean {
    return card.roles.some(r => this.roles.includes(r));
  }
}
