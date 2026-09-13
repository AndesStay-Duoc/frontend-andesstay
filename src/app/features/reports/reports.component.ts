import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../environments/environment';
import { explicarError } from '../../shared/http-error';

interface ReservasPorHora {
  hour: string;
  total: number;
}

interface Kpis {
  range?: string;
  activeReservations?: number;
  reservationsPerHour?: ReservasPorHora[];
}

interface UnidadDemandada {
  unitId: number | string;
  totalReservations: number;
}

const RANGOS = [
  { valor: 'last1h', etiqueta: 'Última hora' },
  { valor: 'last24h', etiqueta: 'Últimas 24 horas' },
  { valor: 'last7d', etiqueta: 'Últimos 7 días' },
  { valor: 'last30d', etiqueta: 'Últimos 30 días' },
];

/**
 * KPIs y reporteria. Solo lectura y solo para Admin.
 *
 * Las dos llamadas son independientes: si la de KPIs falla por rol, la del top de unidades
 * falla igual, y cada una muestra su propio codigo de respuesta. Eso hace visible que el 403
 * viene del backend y no de una comprobacion de la interfaz.
 */
@Component({
  selector: 'app-reports',
  imports: [FormsModule],
  template: `
    <section>
      <h1>Reportería</h1>
      <p class="ruta">{{ rutaKpis }} · {{ rutaTop }}</p>

      <div class="acciones">
        <label>
          Rango
          <select [(ngModel)]="rango" name="rango">
            @for (r of rangos; track r.valor) {
              <option [value]="r.valor">{{ r.etiqueta }}</option>
            }
          </select>
        </label>
        <button (click)="cargar()" [disabled]="cargando()">
          {{ cargando() ? 'Cargando…' : 'Cargar indicadores' }}
        </button>
      </div>

      @if (estadoKpis(); as e) {
        <p class="estado" [class.ok]="e < 400" [class.mal]="e >= 400">KPIs · HTTP {{ e }}</p>
      }
      @if (estadoTop(); as e) {
        <p class="estado" [class.ok]="e < 400" [class.mal]="e >= 400">Top unidades · HTTP {{ e }}</p>
      }

      @if (error(); as msg) {
        <p class="error">{{ msg }}</p>
      }

      @if (kpis(); as k) {
        <div class="tarjetas">
          <div class="tarjeta">
            <span class="cifra">{{ k.activeReservations ?? 0 }}</span>
            <span class="rotulo">Reservas activas</span>
          </div>
          <div class="tarjeta">
            <span class="cifra">{{ totalEnPeriodo() }}</span>
            <span class="rotulo">Reservas en el período</span>
          </div>
          <div class="tarjeta">
            <span class="cifra">{{ promedioPorHora() }}</span>
            <span class="rotulo">Promedio por hora</span>
          </div>
        </div>

        @if (porHora().length > 0) {
          <h2>Reservas por hora</h2>
          <table>
            <thead><tr><th>Hora</th><th class="num">Total</th></tr></thead>
            <tbody>
              @for (h of porHora(); track h.hour) {
                <tr><td class="mono">{{ h.hour }}</td><td class="num">{{ h.total }}</td></tr>
              }
            </tbody>
          </table>
        }
      }

      @if (topUnidades().length > 0) {
        <h2>Unidades más demandadas</h2>
        <table>
          <thead><tr><th class="num">#</th><th>Unidad</th><th class="num">Reservas</th></tr></thead>
          <tbody>
            @for (u of topUnidades(); track u.unitId; let i = $index) {
              <tr>
                <td class="num">{{ i + 1 }}</td>
                <td class="mono">{{ u.unitId }}</td>
                <td class="num">{{ u.totalReservations }}</td>
              </tr>
            }
          </tbody>
        </table>
      }

      @if (consultado() && !cargando() && !error() && porHora().length === 0 && topUnidades().length === 0) {
        <p class="vacio">No hay datos agregados para este rango todavía.</p>
      }
    </section>
  `,
  styles: [`
    section { font-family: system-ui, sans-serif; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1rem; margin-top: 2rem; }
    .ruta { font-family: ui-monospace, monospace; font-size: .8rem; color: var(--texto-sutil); word-break: break-all; }
    .acciones { display: flex; flex-wrap: wrap; align-items: end; gap: 1rem; margin-bottom: 1rem; }
    label { display: flex; flex-direction: column; gap: .25rem; font-size: .85rem; color: var(--texto-sutil); }
    select { padding: .4rem .5rem; border: 1px solid var(--borde); border-radius: .3rem; }
    button { padding: .6rem 1.2rem; border: 0; border-radius: .35rem; background: var(--acento); color: #fff; cursor: pointer; }
    button:disabled { opacity: .6; cursor: default; }
    .estado { display: inline-block; margin-right: .5rem; padding: .3rem .7rem; border-radius: .3rem; font-family: ui-monospace, monospace; font-size: .85rem; }
    .estado.ok { background: var(--ok-fondo); color: var(--ok-texto); }
    .estado.mal { background: var(--mal-fondo); color: var(--mal-texto); }
    .error { color: var(--error); font-size: .9rem; max-width: 46rem; }
    .vacio { color: var(--texto-sutil); font-size: .9rem; }
    .tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 1rem; margin-top: 1.5rem; max-width: 46rem; }
    .tarjeta { display: flex; flex-direction: column; gap: .25rem; border: 1px solid var(--borde); border-radius: .4rem; padding: 1rem; }
    .cifra { font-size: 1.8rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .rotulo { font-size: .8rem; color: var(--texto-sutil); }
    table { border-collapse: collapse; width: 100%; max-width: 46rem; margin-top: .75rem; font-size: .9rem; }
    th { text-align: left; padding: .5rem .75rem; background: var(--fondo-sutil); }
    td { padding: .5rem .75rem; border-bottom: 1px solid var(--borde); }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: ui-monospace, monospace; font-size: .8rem; }
  `],
})
export class ReportsComponent {
  private readonly http = inject(HttpClient);

  readonly rutaKpis = `GET ${environment.apiBaseUrl}/api/report/kpis`;
  readonly rutaTop = `GET ${environment.apiBaseUrl}/api/report/top-units`;
  readonly rangos = RANGOS;

  rango = 'last24h';

  readonly kpis = signal<Kpis | null>(null);
  readonly topUnidades = signal<UnidadDemandada[]>([]);
  readonly estadoKpis = signal<number | null>(null);
  readonly estadoTop = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly consultado = signal(false);

  readonly porHora = computed(() => this.kpis()?.reservationsPerHour ?? []);
  readonly totalEnPeriodo = computed(() =>
    this.porHora().reduce((suma, h) => suma + (h.total ?? 0), 0),
  );
  readonly promedioPorHora = computed(() => {
    const horas = this.porHora().length;
    return horas === 0 ? 0 : Math.round((this.totalEnPeriodo() / horas) * 10) / 10;
  });

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.kpis.set(null);
    this.topUnidades.set([]);

    let pendientes = 2;
    const terminar = () => {
      pendientes -= 1;
      if (pendientes === 0) {
        this.cargando.set(false);
        this.consultado.set(true);
      }
    };

    this.http
      .get<Kpis>(`${environment.apiBaseUrl}/api/report/kpis`, {
        params: { range: this.rango },
        observe: 'response',
      })
      .subscribe({
        next: (respuesta) => {
          this.estadoKpis.set(respuesta.status);
          this.kpis.set(respuesta.body);
          terminar();
        },
        error: (e: HttpErrorResponse) => {
          this.estadoKpis.set(e.status);
          this.error.set(explicarError(e));
          terminar();
        },
      });

    this.http
      .get<UnidadDemandada[]>(`${environment.apiBaseUrl}/api/report/top-units`, {
        params: { range: this.rango },
        observe: 'response',
      })
      .subscribe({
        next: (respuesta) => {
          this.estadoTop.set(respuesta.status);
          this.topUnidades.set(respuesta.body ?? []);
          terminar();
        },
        error: (e: HttpErrorResponse) => {
          this.estadoTop.set(e.status);
          this.error.update((actual) => actual ?? explicarError(e));
          terminar();
        },
      });
  }
}
