import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReservationService, Reservation } from '../../services/reservation.service';
import { CatalogService, Hostal, Unit } from '../../services/catalog.service';
import { PortadaClienteComponent } from './portada-cliente.component';
import { forkJoin } from 'rxjs';
import { diasDesdeHoy, fechaLocalIso } from '../../core/fecha-local';
import { IconoComponent } from '../../shared/icono/icono.component';
import { EstadoReservaComponent } from '../../shared/reserva/estado-reserva.component';
import { estadoReserva } from '../../shared/reserva/estado-reserva';
import { tipoAlojamiento } from '../../shared/alojamiento/alojamiento-meta';
import { TarjetaGraficoComponent } from '../../shared/graficos/tarjeta-grafico.component';
import { GraficoDonaComponent } from '../../shared/graficos/grafico-dona.component';
import { GraficoAreaComponent } from '../../shared/graficos/grafico-area.component';
import { GraficoBarrasComponent } from '../../shared/graficos/grafico-barras.component';
import { CategoriaApilada, COLOR, Punto, Segmento, SerieApilada } from '../../shared/graficos/graficos';

interface QuickCard {
  icon: string;
  label: string;
  desc: string;
  route: string;
  roles: string[];
}

/** Roles a los que el backend sirve GET /reservations y GET /catalog/units. */
const ROLES_CON_DATOS = ['Admin', 'Operador', 'Cliente'];

/** Estados «en curso», en el orden y con los colores validados para la dona. */
const EN_CURSO: { estado: string; color: string }[] = [
  { estado: 'CREADA', color: COLOR.acero },
  { estado: 'CONFIRMADA', color: COLOR.petroleo },
  { estado: 'CHECKIN_PENDIENTE', color: COLOR.rojo },
  { estado: 'EN_ESTADIA', color: COLOR.vino },
];

/** Color por tipo de alojamiento (siempre el mismo para cada tipo). */
const COLOR_TIPO: Record<string, string> = { CABANA: COLOR.petroleo, HABITACION: COLOR.vino, LODGE: COLOR.acero };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, PortadaClienteComponent, IconoComponent, EstadoReservaComponent, TarjetaGraficoComponent,
    GraficoDonaComponent, GraficoAreaComponent, GraficoBarrasComponent],
  template: `
    <!-- El Cliente ve la portada «encuentra tu próxima estadía»; el personal, el panel. -->
    @if (esCliente) {
      <app-portada-cliente [nombre]="nombre" [unidades]="unidades" [reservas]="reservas" [hostales]="hostales"
                           [cargando]="!kpiLoaded" [error]="loadError" />
    } @else {
      <div class="cabecera" id="resumen">
        <h1>Panel</h1>
        <p class="fecha">{{ today }}</p>
      </div>

      <!-- Sin acceso o con error, se dice. Antes el panel mostraba ceros como si fueran datos. -->
      @if (sinAcceso) {
        <div class="aviso aviso-info" role="status"><app-icono nombre="info" [tamano]="22" />
          <div>Tu rol no tiene acceso a reservas ni al catálogo, así que este panel no muestra cifras.
            @if (canSeeRoute('/audit')) { <a routerLink="/audit"><b>Ir a Auditoría</b></a> }</div></div>
      }
      @if (loadError) {
        <div class="aviso aviso-error" role="alert"><app-icono nombre="error" [tamano]="22" /><div>{{ loadError }}</div></div>
      }

      <section class="kpis" aria-label="Indicadores">
        @for (k of kpis; track k.etiqueta) {
          <div class="tarjeta kpi">
            <span class="kpi-ic"><app-icono [nombre]="k.icono" /></span>
            <div>
              @if (kpiLoaded) { <div class="kpi-v">{{ hayDatos ? k.valor : '—' }}</div> }
              @else { <div class="esqueleto" style="height:28px;width:56px"></div> }
              <div class="kpi-l">{{ k.etiqueta }}</div>
            </div>
          </div>
        }
      </section>

      @if (hayDatos) {
        <section class="graficos" id="graficos" aria-label="Gráficos">
          <app-tarjeta-grafico titulo="Reservas en curso por estado" subtitulo="Fuente: reservas · sin finalizadas ni canceladas"
                               enlace="/reservations" [vacio]="!kpiLoaded || totalEnCurso === 0" textoVacio="No hay reservas en curso.">
            <app-grafico-dona grafico [segmentos]="segEstados" textoCentro="en curso"
                              [descripcion]="'Dona de reservas en curso por estado: ' + resumenSegmentos(segEstados)" />
            <table tabla><thead><tr><th>Estado</th><th class="num">Reservas</th></tr></thead>
              <tbody>@for (s of segEstados; track s.etiqueta) { <tr><td>{{ s.etiqueta }}</td><td class="num">{{ s.valor }}</td></tr> }</tbody></table>
          </app-tarjeta-grafico>

          <app-tarjeta-grafico titulo="Próximas llegadas" subtitulo="Check-ins por día · próximos 30 días"
                               enlace="/reservations" [vacio]="!kpiLoaded || totalLlegadas === 0" textoVacio="No hay llegadas en los próximos 30 días.">
            <app-grafico-area grafico [puntos]="llegadas30" unidad="llegadas"
                              [descripcion]="totalLlegadas + ' llegadas en los próximos 30 días'" />
            <table tabla><thead><tr><th>Día</th><th class="num">Llegadas</th></tr></thead>
              <tbody>@for (p of llegadas30; track p.etiqueta) { @if (p.valor > 0) { <tr><td>{{ p.etiqueta }}</td><td class="num">{{ p.valor }}</td></tr> } }</tbody></table>
          </app-tarjeta-grafico>

          <app-tarjeta-grafico titulo="Reservas por mes de llegada" subtitulo="En curso, finalizadas y canceladas · últimos 6 meses con datos"
                               enlace="/reservations" [vacio]="!kpiLoaded || meses.length === 0" textoVacio="Aún no hay reservas.">
            <app-grafico-barras grafico [series]="seriesMeses" [categorias]="meses"
                                descripcion="Barras apiladas de reservas por mes de llegada" />
            <table tabla><thead><tr><th>Mes</th>@for (s of seriesMeses; track s.nombre) { <th class="num">{{ s.nombre }}</th> }</tr></thead>
              <tbody>@for (m of meses; track m.etiqueta) { <tr><td>{{ m.etiqueta }}</td>@for (v of m.valores; track $index) { <td class="num">{{ v }}</td> }</tr> }</tbody></table>
          </app-tarjeta-grafico>

          <app-tarjeta-grafico titulo="Alojamientos por tipo" subtitulo="Fuente: catálogo · unidades activas"
                               enlace="/catalog" [vacio]="!kpiLoaded || unidades.length === 0" textoVacio="No hay unidades en el catálogo.">
            <app-grafico-dona grafico [segmentos]="segTipos" [torta]="true"
                              [descripcion]="'Torta de alojamientos por tipo: ' + resumenSegmentos(segTipos)" />
            <table tabla><thead><tr><th>Tipo</th><th class="num">Unidades</th><th class="num">Con cupo</th></tr></thead>
              <tbody>@for (t of tablaTipos; track t.etiqueta) { <tr><td>{{ t.etiqueta }}</td><td class="num">{{ t.total }}</td><td class="num">{{ t.conCupo }}</td></tr> }</tbody></table>
          </app-tarjeta-grafico>
        </section>

        <section class="tarjeta llegadas" id="llegadas">
          <div class="llegadas-cab">
            <h2>Llegadas de hoy</h2>
            <a class="btn btn-texto btn-chico" routerLink="/reservations">Ver todas <app-icono nombre="arrow_forward" [tamano]="18" /></a>
          </div>
          @if (!kpiLoaded) {
            <div class="esqueleto" style="height:44px"></div>
          } @else if (arrivals.length > 0) {
            <ul>
              @for (r of arrivals; track r.id) {
                <li>
                  <span class="ll-ic"><app-icono nombre="key" /></span>
                  <span class="ll-q"><b>{{ r.guestEmail }}</b><span>{{ nombreUnidad(r.unitId) }}@if (r.huespedes) { · {{ r.huespedes }} {{ r.huespedes === 1 ? 'persona' : 'personas' }} }</span></span>
                  <span class="ll-d">{{ r.checkIn | date:'d MMM' }}</span>
                  <app-estado-reserva [estado]="r.status" />
                </li>
              }
            </ul>
          } @else {
            <p class="sin">Sin llegadas programadas para hoy.</p>
          }
        </section>
      }

      <nav class="accesos" aria-label="Accesos rápidos">
        @for (c of quickCards; track c.route) {
          @if (canSee(c)) {
            <a class="tarjeta acceso" [routerLink]="c.route">
              <app-icono [nombre]="c.icon" />
              <span><b>{{ c.label }}</b><small>{{ c.desc }}</small></span>
            </a>
          }
        }
      </nav>
    }
  `,
  styles: [`
    :host { display: block; }
    .cabecera { margin-bottom: 18px; scroll-margin-top: 80px; }
    h1 { font-size: clamp(30px, 3.6vw, 40px); }
    .fecha { font-weight: 700; color: var(--text-muted); }
    .aviso { margin-bottom: 18px; }
    .aviso a { margin-left: 6px; text-decoration: underline; }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
    .kpi { display: flex; align-items: center; gap: 14px; padding: 16px; }
    .kpi-ic { display: grid; place-items: center; flex-shrink: 0; width: 46px; height: 46px; border-radius: 12px; background: var(--c-crema); color: var(--brand); }
    .kpi-v { font-size: 30px; font-weight: 800; line-height: 1.1; }
    .kpi-l { font-size: 13px; font-weight: 700; color: var(--text-muted); }

    .graficos { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; scroll-margin-top: 80px; }

    .llegadas { margin-top: 18px; padding: 18px; scroll-margin-top: 80px; }
    .llegadas-cab { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px; }
    .llegadas h2 { font-family: var(--font-body); font-size: 17px; font-weight: 800; }
    .llegadas ul { display: grid; gap: 4px; list-style: none; }
    .llegadas li { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; }
    .llegadas li:hover { background: var(--surface-sutil); }
    .ll-ic { display: grid; place-items: center; flex-shrink: 0; width: 38px; height: 38px; border-radius: 10px; background: var(--c-crema); color: var(--brand); }
    .ll-q { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .ll-q b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ll-q span, .ll-d, .sin { font-size: 13px; color: var(--text-muted); }

    .accesos { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-top: 18px; }
    .acceso { display: flex; align-items: center; gap: 12px; padding: 14px; color: var(--text); }
    .acceso:hover { box-shadow: var(--shadow-2); }
    .acceso > app-icono { color: var(--brand); }
    .acceso span { display: flex; flex-direction: column; }
    .acceso small { color: var(--text-muted); }

    @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(2, 1fr); } .graficos { grid-template-columns: 1fr; } }
    @media (max-width: 600px) {
      .llegadas li { flex-wrap: wrap; }
      .ll-q { flex: 1 1 calc(100% - 60px); }
      .ll-d { margin-left: 50px; }
    }
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
  /** El rol no tiene acceso a reservas ni catalogo, asi que no se piden. */
  sinAcceso = false;
  /** Mensaje si la carga fallo; con el las cifras se muestran como «—» y no como ceros. */
  loadError = '';

  // Para la portada del Cliente y los gráficos del panel: los mismos datos que ya se descargan.
  esCliente = false;
  nombre = '';
  reservas: Reservation[] = [];
  unidades: Unit[] = [];
  hostales: Hostal[] = [];

  // Gráficos (D9): solo datos reales de las dos llamadas de arriba, nada inventado.
  segEstados: Segmento[] = [];
  llegadas30: Punto[] = [];
  readonly seriesMeses: SerieApilada[] = [
    { nombre: 'En curso', color: COLOR.petroleo },
    { nombre: 'Finalizadas', color: COLOR.acero },
    { nombre: 'Canceladas', color: COLOR.rojo },
  ];
  meses: CategoriaApilada[] = [];
  segTipos: Segmento[] = [];
  tablaTipos: { etiqueta: string; total: number; conCupo: number }[] = [];

  private roles: string[] = [];

  quickCards: QuickCard[] = [
    { icon: 'event_available', label: 'Reservas',   desc: 'Gestionar y cambiar estados',  route: '/reservations', roles: ['Admin','Operador','Cliente'] },
    { icon: 'cottage',         label: 'Catálogo',   desc: 'Unidades y disponibilidad',    route: '/catalog',      roles: ['Admin','Operador'] },
    { icon: 'bar_chart',       label: 'Reportería', desc: 'KPIs y métricas de ocupación', route: '/reports',      roles: ['Admin'] },
    { icon: 'fact_check',      label: 'Auditoría',  desc: 'Trazabilidad de eventos',      route: '/audit',        roles: ['Admin','Auditor'] },
  ];

  constructor(
    private auth: AuthService,
    private reservationSvc: ReservationService,
    private catalogSvc: CatalogService
  ) {}

  ngOnInit() {
    this.roles = this.auth.getRoles();
    // Mismo criterio que el layout: Cliente sin ningun rol de personal.
    this.esCliente = this.roles.includes('Cliente')
      && !['Admin', 'Operador', 'Auditor'].some(r => this.roles.includes(r));
    this.nombre = (this.auth.getAccount()?.name ?? '').split(' ')[0];

    const now = new Date();
    this.today = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    this.today = this.today.charAt(0).toUpperCase() + this.today.slice(1);

    // Un rol sin acceso a reservas ni catalogo (el Auditor) recibiria 403 en las dos llamadas.
    // Antes se hacian igual y el error se tragaba: el panel mostraba ceros como si fueran datos.
    if (!ROLES_CON_DATOS.some(r => this.roles.includes(r))) {
      this.sinAcceso = true;
      this.kpiLoaded = true;
      return;
    }

    // Los nombres de establecimiento solo los muestra la portada del Cliente. Va aparte del
    // forkJoin a proposito: si falla, la portada sigue funcionando sin ellos.
    if (this.esCliente) {
      this.catalogSvc.getHostales().subscribe({
        next: data => this.hostales = data,
        error: () => { /* las tarjetas se muestran sin establecimiento */ }
      });
    }

    // Hoy en hora local, no en UTC: ver fechaLocalIso.
    const todayStr = fechaLocalIso(now);

    forkJoin({
      allReservations: this.reservationSvc.getAll(),
      todayArrivals: this.reservationSvc.getAll('CHECKIN_PENDIENTE', todayStr, todayStr),
      units: this.catalogSvc.getAll()
    }).subscribe({
      next: ({ allReservations, todayArrivals, units }) => {
        this.activeCount = allReservations.filter(
          r => r.status && !['CHECKOUT','CANCELADA'].includes(r.status)
        ).length;
        // Se vuelve a filtrar aqui porque, para un Cliente, el backend ignora status, from y to y
        // devuelve TODAS sus reservas: sin esto, cualquier reserva suya contaba como llegada de hoy.
        // Para el personal el filtro coincide con el del backend y no cambia nada.
        const llegadasHoy = todayArrivals.filter(
          r => r.status === 'CHECKIN_PENDIENTE' && r.checkIn?.slice(0, 10) === todayStr
        );
        this.arrivals = llegadasHoy.slice(0, 5);
        this.arrivingCount = llegadasHoy.length;
        this.reservas = allReservations;
        this.unidades = units;
        this.totalUnits = units.length;
        this.availableUnits = units.filter(u => u.availableSlots > 0).length;
        if (!this.esCliente) {
          this.construirGraficos(allReservations, units);
        }
        this.kpiLoaded = true;
      },
      error: err => {
        this.loadError = err?.status === 403
          ? 'Tu rol no tiene acceso a estos datos.'
          : 'No se pudieron cargar los datos del panel. Verifica que el backend esté en ejecución.';
        this.kpiLoaded = true;
      }
    });
  }

  /** Hay cifras reales que mostrar: ni falto el permiso ni fallo la carga. */
  get hayDatos(): boolean {
    return !this.sinAcceso && !this.loadError;
  }

  get kpis() {
    return [
      { etiqueta: 'Reservas en curso', valor: this.activeCount, icono: 'event_available' },
      { etiqueta: 'Llegadas hoy', valor: this.arrivingCount, icono: 'key' },
      { etiqueta: 'Unidades con cupo', valor: this.availableUnits, icono: 'check_circle' },
      { etiqueta: 'Total unidades', valor: this.totalUnits, icono: 'cottage' },
    ];
  }

  get totalEnCurso(): number { return this.segEstados.reduce((s, x) => s + x.valor, 0); }
  get totalLlegadas(): number { return this.llegadas30.reduce((s, x) => s + x.valor, 0); }

  /** Calcula los cuatro gráficos con las reservas y unidades ya descargadas. */
  private construirGraficos(reservas: Reservation[], unidades: Unit[]) {
    // Dona: reservas en curso por estado.
    this.segEstados = EN_CURSO.map(e => ({
      etiqueta: estadoReserva(e.estado).etiqueta,
      valor: reservas.filter(r => r.status === e.estado).length,
      color: e.color,
    }));

    // Área: llegadas (check-in) por día, de hoy a 29 días más. Las canceladas no llegan.
    this.llegadas30 = Array.from({ length: 30 }, (_, i) => {
      const dia = diasDesdeHoy(i);
      const iso = fechaLocalIso(dia);
      return {
        etiqueta: dia.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
        valor: reservas.filter(r => r.status !== 'CANCELADA' && r.checkIn?.slice(0, 10) === iso).length,
      };
    });

    // Barras apiladas: reservas por mes de llegada, los últimos 6 meses que tienen datos.
    const porMes = new Map<string, number[]>();
    for (const r of reservas) {
      const mes = r.checkIn?.slice(0, 7);
      if (!mes) continue;
      const v = porMes.get(mes) ?? [0, 0, 0];
      if (r.status === 'CANCELADA') v[2]++;
      else if (r.status === 'CHECKOUT') v[1]++;
      else v[0]++;
      porMes.set(mes, v);
    }
    this.meses = [...porMes.keys()].sort().slice(-6).map(mes => ({
      etiqueta: new Date(mes + '-01T12:00:00').toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }),
      valores: porMes.get(mes)!,
    }));

    // Torta: unidades por tipo; la tabla agrega cuántas tienen cupo.
    const tipos = [...new Set(unidades.map(u => (u.type ?? '').toUpperCase()))].sort();
    this.tablaTipos = tipos.map(t => ({
      etiqueta: tipoAlojamiento(t).etiqueta,
      total: unidades.filter(u => (u.type ?? '').toUpperCase() === t).length,
      conCupo: unidades.filter(u => (u.type ?? '').toUpperCase() === t && u.availableSlots > 0).length,
    }));
    this.segTipos = tipos.map((t, i) => ({
      etiqueta: tipoAlojamiento(t).etiqueta,
      valor: this.tablaTipos[i].total,
      color: COLOR_TIPO[t] ?? COLOR.acero,
    }));
  }

  resumenSegmentos(segs: Segmento[]): string {
    return segs.map(s => s.etiqueta + ' ' + s.valor).join(', ');
  }

  nombreUnidad(unitId: number): string {
    return this.unidades.find(u => u.id === unitId)?.name ?? 'Unidad ' + unitId;
  }

  canSee(card: QuickCard): boolean {
    return card.roles.some(r => this.roles.includes(r));
  }

  canSeeRoute(route: string): boolean {
    const card = this.quickCards.find(c => c.route === route);
    return !!card && this.canSee(card);
  }
}
