import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Reportería</h1>
          <p class="page-sub">KPIs y métricas en tiempo real</p>
        </div>
        <div class="range-select-wrap">
          <label>Período</label>
          <select [(ngModel)]="range" (change)="loadKpis()">
            <option value="last1h">Última hora</option>
            <option value="last24h">Últimas 24 h</option>
            <option value="last7d">Últimos 7 días</option>
            <option value="last30d">Últimos 30 días</option>
          </select>
        </div>
      </div>

      <!-- KPI cards -->
      <div class="kpi-row" *ngIf="kpis">
        <div class="kpi-card" style="--c:#26729B;--bg:#BFE7F4">
          <div class="kpi-icon">🏨</div>
          <div class="kpi-body">
            <p class="kpi-label">Reservas Activas</p>
            <p class="kpi-value">{{ kpis.activeReservations ?? 0 }}</p>
          </div>
        </div>
        <div class="kpi-card" style="--c:#3A96C4;--bg:#d0ecf8">
          <div class="kpi-icon">📅</div>
          <div class="kpi-body">
            <p class="kpi-label">Reservas en período</p>
            <p class="kpi-value">{{ totalInPeriod }}</p>
          </div>
        </div>
        <div class="kpi-card" style="--c:#4EA8D1;--bg:#e0f5fe">
          <div class="kpi-icon">📈</div>
          <div class="kpi-body">
            <p class="kpi-label">Prom. por hora</p>
            <p class="kpi-value">{{ avgPerHour }}</p>
          </div>
        </div>
        <div class="kpi-card" style="--c:#78C1E0;--bg:#eaf8fd">
          <div class="kpi-icon">🏆</div>
          <div class="kpi-body">
            <p class="kpi-label">Top unidades</p>
            <p class="kpi-value">{{ topUnits.length }}</p>
          </div>
        </div>
      </div>

      <!-- Loading placeholders -->
      <div class="kpi-row" *ngIf="!kpis">
        <div class="kpi-skeleton" *ngFor="let i of [1,2,3,4]"></div>
      </div>

      <!-- Two columns: hourly table + top units -->
      <div class="two-col" *ngIf="kpis">

        <!-- Hourly table -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Reservas por hora</span>
            <span class="panel-badge">{{ kpis.reservationsPerHour?.length ?? 0 }} registros</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Hora</th><th>Total</th><th>Barra</th></tr></thead>
              <tbody>
                <tr *ngFor="let h of kpis.reservationsPerHour">
                  <td class="hour-cell">{{ h.hour }}:00</td>
                  <td class="count-cell">{{ h.total }}</td>
                  <td class="bar-cell">
                    <div class="bar-wrap">
                      <div class="bar-fill" [style.width]="barWidth(h.total) + '%'"></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p class="empty-msg" *ngIf="!kpis.reservationsPerHour?.length">Sin datos para el período.</p>
          </div>
        </div>

        <!-- Top units -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Top Unidades</span>
            <span class="panel-badge">{{ topUnits.length }} unidades</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Posición</th><th>Unidad ID</th><th>Reservas</th></tr></thead>
              <tbody>
                <tr *ngFor="let u of topUnits; let i = index">
                  <td class="rank-cell">
                    <span class="rank" [class.gold]="i===0" [class.silver]="i===1" [class.bronze]="i===2">
                      {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i+1) }}
                    </span>
                  </td>
                  <td><span class="unit-chip">Unidad {{ u.unitId }}</span></td>
                  <td class="count-cell">{{ u.totalReservations }}</td>
                </tr>
              </tbody>
            </table>
            <p class="empty-msg" *ngIf="!topUnits.length">Sin datos para el período.</p>
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
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title { font-size: 26px; font-weight: 800; color: #26729B; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #4EA8D1; margin: 0; }
    .range-select-wrap { display: flex; flex-direction: column; gap: 5px; }
    .range-select-wrap label { font-size: 11px; color: #78C1E0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    select {
      padding: 9px 14px; border-radius: 9px; border: 1px solid #BFE7F4;
      font-size: 13px; color: #26729B; background: white; cursor: pointer; min-width: 160px;
    }
    select:focus { outline: none; border-color: #3A96C4; }

    /* KPI cards */
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 18px; margin-bottom: 28px; }
    .kpi-card {
      background: white;
      border-radius: 14px;
      border: 1px solid #BFE7F4;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 10px rgba(38,114,155,0.07);
      border-left: 4px solid var(--c);
      transition: all 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(38,114,155,0.13); }
    .kpi-icon { font-size: 28px; }
    .kpi-body { flex: 1; }
    .kpi-label { font-size: 12px; color: #78C1E0; margin: 0 0 4px; }
    .kpi-value { font-size: 30px; font-weight: 800; color: #26729B; margin: 0; }

    /* Skeleton */
    .kpi-skeleton {
      height: 90px; background: #BFE7F4;
      border-radius: 14px; animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* Two col */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 800px) { .two-col { grid-template-columns: 1fr; } }

    .panel {
      background: white;
      border-radius: 14px;
      border: 1px solid #BFE7F4;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(38,114,155,0.07);
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid #BFE7F4;
      background: #F9F9F7;
    }
    .panel-title { font-size: 14px; font-weight: 700; color: #26729B; }
    .panel-badge {
      font-size: 11px;
      background: #BFE7F4;
      color: #26729B;
      padding: 2px 9px;
      border-radius: 20px;
      font-weight: 600;
    }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th {
      padding: 10px 14px;
      text-align: left;
      font-size: 11px;
      color: #78C1E0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      border-bottom: 1px solid #BFE7F4;
    }
    td { padding: 11px 14px; font-size: 13px; color: #26729B; border-bottom: 1px solid #F9F9F7; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #F9F9F7; }

    .hour-cell { font-family: monospace; color: #4EA8D1; }
    .count-cell { font-weight: 700; color: #26729B; text-align: right; }

    .bar-cell { width: 100px; }
    .bar-wrap { background: #BFE7F4; border-radius: 4px; height: 8px; overflow: hidden; }
    .bar-fill { background: linear-gradient(90deg, #26729B, #4EA8D1); height: 100%; border-radius: 4px; transition: width 0.4s; }

    .rank-cell { font-size: 16px; }
    .unit-chip {
      background: #BFE7F4; color: #26729B;
      padding: 3px 10px; border-radius: 20px;
      font-size: 12px; font-weight: 600;
    }

    .empty-msg { text-align: center; color: #78C1E0; font-size: 13px; padding: 24px; }
  `]
})
export class ReportsComponent implements OnInit {

  kpis: any = null;
  topUnits: any[] = [];
  range = 'last24h';

  get totalInPeriod(): number {
    return this.kpis?.reservationsPerHour?.reduce((s: number, h: any) => s + Number(h.total), 0) ?? 0;
  }

  get avgPerHour(): string {
    const hours = this.kpis?.reservationsPerHour?.length ?? 1;
    return (this.totalInPeriod / (hours || 1)).toFixed(1);
  }

  barWidth(total: number): number {
    const max = Math.max(...(this.kpis?.reservationsPerHour?.map((h: any) => Number(h.total)) ?? [1]));
    return max ? Math.round((total / max) * 100) : 0;
  }

  constructor(private svc: ReportService) {}

  ngOnInit() { this.loadKpis(); this.loadTopUnits(); }

  loadKpis() {
    this.kpis = null;
    this.svc.getKpis(this.range).subscribe({ next: data => this.kpis = data, error: () => this.kpis = {} });
    this.loadTopUnits();
  }

  loadTopUnits() {
    const r = this.range === 'last1h' ? 'last24h' : this.range;
    this.svc.getTopUnits(r).subscribe({ next: data => this.topUnits = data, error: () => this.topUnits = [] });
  }
}