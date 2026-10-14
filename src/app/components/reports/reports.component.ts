import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report.service';
import { CatalogService, Unit } from '../../services/catalog.service';
import { IconoComponent } from '../../shared/icono/icono.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [DecimalPipe, FormsModule, IconoComponent],
  template: `
    <div class="cabecera">
      <div>
        <h1>Reportería</h1>
        <p class="sub">KPIs de las reservas, calculados por el servicio de reportes a partir de sus eventos.</p>
      </div>
      <div class="campo periodo">
        <label for="rango">Período</label>
        <div class="control"><app-icono nombre="date_range" />
          <select id="rango" [(ngModel)]="range" (change)="loadKpis()">
            <option value="last1h">Última hora</option>
            <option value="last24h">Últimas 24 h</option>
            <option value="last7d">Últimos 7 días</option>
            <option value="last30d">Últimos 30 días</option>
          </select>
        </div>
      </div>
    </div>

    @if (errorKpis) {
      <div class="aviso aviso-error" role="alert"><app-icono nombre="cloud_off" [tamano]="22" />
        <div><strong>No se pudieron cargar los KPIs</strong>Verifica que el servicio de reportes esté en ejecución. Las cifras se muestran como «—».</div></div>
    }

    <section class="kpis" aria-label="Indicadores" aria-live="polite">
      @for (k of indicadores; track k.etiqueta) {
        <div class="tarjeta kpi">
          <span class="kpi-ic"><app-icono [nombre]="k.icono" /></span>
          <div>
            @if (kpis) { <div class="kpi-v">{{ errorKpis ? '—' : k.valor }}</div> }
            @else { <div class="esqueleto" style="height:28px;width:56px"></div> }
            <div class="kpi-l">{{ k.etiqueta }}</div>
          </div>
        </div>
      }
    </section>

    <div class="paneles">
      <section class="tarjeta panel" aria-labelledby="t-hora">
        <div class="panel-cab">
          <h2 id="t-hora">Reservas creadas por hora</h2>
          <span class="chip">{{ kpis?.reservationsPerHour?.length ?? 0 }} registros</span>
        </div>
        @if (!kpis) {
          <div class="esqueleto" style="height:120px"></div>
        } @else if (kpis.reservationsPerHour?.length) {
          <ol class="filas">
            @for (h of kpis.reservationsPerHour; track h.hour) {
              <li>
                <span class="hora">{{ hora(h.hour) }}</span>
                <span class="barra" aria-hidden="true"><span [style.width.%]="barWidth(h.total)"></span></span>
                <b>{{ h.total }}</b>
              </li>
            }
          </ol>
        } @else {
          <p class="vacio"><app-icono nombre="insights" [tamano]="28" />Sin datos para el período.</p>
        }
      </section>

      <section class="tarjeta panel" aria-labelledby="t-top">
        <div class="panel-cab">
          <h2 id="t-top">Alojamientos más reservados</h2>
          <span class="chip">{{ topUnits.length }} {{ topUnits.length === 1 ? 'unidad' : 'unidades' }}</span>
        </div>
        @if (topUnits.length) {
          <ol class="filas ranking">
            @for (u of topUnits; track u.unitId; let i = $index) {
              <li>
                <span class="pos" [class.podio]="i < 3">{{ i + 1 }}</span>
                <span class="nombre">{{ nombreUnidad(u.unitId) }}
                  @if (unidadConocida(u.unitId)) { <small>Unidad {{ u.unitId }}</small> }</span>
                <span class="barra" aria-hidden="true"><span [style.width.%]="anchoTop(u.totalReservations)"></span></span>
                <b>{{ u.totalReservations }}</b>
              </li>
            }
          </ol>
        } @else {
          <p class="vacio"><app-icono nombre="insights" [tamano]="28" />Sin datos para el período.</p>
        }
        @if (range === 'last1h') {
          <p class="nota">Con «Última hora», este ranking usa las últimas 24 h.</p>
        }
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .cabecera { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
    h1 { font-size: clamp(28px, 4vw, 38px); }
    .sub, .nota { color: var(--text-muted); }
    .periodo { min-width: 220px; }
    .aviso { margin-bottom: 18px; }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
    .kpi { display: flex; align-items: center; gap: 14px; padding: 16px; }
    .kpi-ic { display: grid; place-items: center; flex-shrink: 0; width: 46px; height: 46px; border-radius: 12px; background: var(--c-crema); color: var(--brand); }
    .kpi-v { font-size: 30px; font-weight: 800; line-height: 1.1; }
    .kpi-l { font-size: 13px; font-weight: 700; color: var(--text-muted); }

    .paneles { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
    .panel { padding: 18px; }
    .panel-cab { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
    .panel h2 { font-family: var(--font-body); font-size: 17px; font-weight: 800; }
    .chip { padding: 3px 10px; border-radius: 999px; background: var(--c-crema); font-size: 12px; font-weight: 800; white-space: nowrap; }
    .filas { display: grid; gap: 6px; max-height: 420px; overflow-y: auto; list-style: none; }
    .filas li { display: grid; grid-template-columns: 110px 1fr 36px; gap: 12px; align-items: center; font-size: 14px; }
    .ranking li { grid-template-columns: 30px minmax(120px, 1.2fr) 1fr 36px; }
    .filas b { text-align: right; font-variant-numeric: tabular-nums; }
    .hora { color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .barra { height: 10px; border-radius: 0 4px 4px 0; background: var(--surface-sutil); overflow: hidden; }
    .barra span { display: block; height: 100%; border-radius: 0 4px 4px 0; background: var(--c-petroleo); }
    .pos { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--c-neutro); font-weight: 800; font-size: 13px; }
    .pos.podio { background: var(--c-petroleo); color: var(--c-crema); }
    .nombre { display: flex; flex-direction: column; font-weight: 700; min-width: 0; }
    .nombre small { font-weight: 600; color: var(--text-muted); }
    .vacio { display: grid; justify-items: center; gap: 8px; padding: 28px 0; text-align: center; color: var(--text-muted); }
    .nota { margin-top: 12px; font-size: 12px; }

    @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(2, 1fr); } .paneles { grid-template-columns: 1fr; } }
    @media (max-width: 480px) { .ranking li { grid-template-columns: 30px 1fr 36px; } .ranking .barra { display: none; } }
  `]
})
export class ReportsComponent implements OnInit {

  kpis: any = null;
  topUnits: any[] = [];
  range = 'last24h';
  /** La carga de KPIs falló. Antes kpis quedaba en {} y se veían ceros como si fueran datos. */
  errorKpis = false;
  /** Para mostrar el nombre de cada alojamiento en el ranking en vez de «Unidad N» (D5). */
  private unidades: Unit[] = [];

  get totalInPeriod(): number {
    return this.kpis?.reservationsPerHour?.reduce((s: number, h: any) => s + Number(h.total), 0) ?? 0;
  }

  get avgPerHour(): string {
    const hours = this.kpis?.reservationsPerHour?.length ?? 1;
    return (this.totalInPeriod / (hours || 1)).toFixed(1);
  }

  get indicadores() {
    return [
      // report cuenta las reservas en EN_ESTADIA sin CHECKOUT: huespedes alojados ahora. No es lo
      // mismo que «Reservas activas» del panel, que suma todo lo no terminado.
      { etiqueta: 'En estadía ahora', valor: this.kpis?.activeReservations ?? 0, icono: 'cottage' },
      { etiqueta: 'Reservas en el período', valor: this.totalInPeriod, icono: 'event' },
      { etiqueta: 'Promedio por hora', valor: this.avgPerHour.replace('.', ','), icono: 'schedule' },
      { etiqueta: 'Alojamientos en el ranking', valor: this.topUnits.length, icono: 'military_tech' },
    ];
  }

  barWidth(total: number): number {
    const max = Math.max(...(this.kpis?.reservationsPerHour?.map((h: any) => Number(h.total)) ?? [1]));
    return max ? Math.round((total / max) * 100) : 0;
  }

  anchoTop(total: number): number {
    const max = Math.max(1, ...this.topUnits.map(u => Number(u.totalReservations)));
    return Math.round((Number(total) / max) * 100);
  }

  /** «2026-10-14 10» (lo que devuelve report) → «14 oct, 10:00». */
  hora(valor: string): string {
    const [fecha, h] = String(valor).split(' ');
    const d = new Date(fecha + 'T12:00:00');
    if (!h || isNaN(d.getTime())) return valor + ':00';
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) + ', ' + h + ':00';
  }

  nombreUnidad(unitId: number): string {
    return this.unidades.find(u => u.id === Number(unitId))?.name ?? 'Unidad ' + unitId;
  }

  unidadConocida(unitId: number): boolean {
    return this.unidades.some(u => u.id === Number(unitId));
  }

  constructor(private svc: ReportService, private catalogo: CatalogService) {}

  ngOnInit() {
    this.loadKpis();
    this.loadTopUnits();
    // Solo lectura y aparte: si el catálogo no responde, el ranking sigue con «Unidad N».
    this.catalogo.getAll().subscribe({ next: data => this.unidades = data, error: () => { /* sin nombres */ } });
  }

  loadKpis() {
    this.kpis = null;
    this.errorKpis = false;
    this.svc.getKpis(this.range).subscribe({
      next: data => this.kpis = data,
      error: () => { this.kpis = {}; this.errorKpis = true; }
    });
    this.loadTopUnits();
  }

  loadTopUnits() {
    const r = this.range === 'last1h' ? 'last24h' : this.range;
    this.svc.getTopUnits(r).subscribe({ next: data => this.topUnits = data, error: () => this.topUnits = [] });
  }
}
