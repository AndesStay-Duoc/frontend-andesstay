import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../environments/environment';
import { explicarError } from '../../shared/http-error';

interface EventoAuditoria {
  id?: number;
  eventId: string;
  eventType: string;
  reservationId: number;
  unitId?: number;
  guestId?: string;
  actorId?: string;
  actorRole?: string;
  traceId?: string;
  occurredAt: string;
  persistedAt?: string;
}

type Modo = 'timeline' | 'rango' | 'actor' | 'tipo';

const MODOS: { valor: Modo; etiqueta: string }[] = [
  { valor: 'timeline', etiqueta: 'Timeline de una reserva' },
  { valor: 'rango', etiqueta: 'Eventos por rango de fechas' },
  { valor: 'actor', etiqueta: 'Acciones de un usuario' },
  { valor: 'tipo', etiqueta: 'Eventos por tipo' },
];

/**
 * Consulta de auditoria. Solo lectura, para Admin y Auditor.
 *
 * La auditoria es append-only: esta pantalla no ofrece ninguna accion de modificacion ni de
 * borrado, a proposito. Los cuatro modos corresponden a los cuatro endpoints de consulta que
 * expone el servicio.
 */
@Component({
  selector: 'app-audit',
  imports: [FormsModule],
  template: `
    <section>
      <h1>Auditoría</h1>
      <p class="ruta">{{ rutaActual() }}</p>

      <div class="acciones">
        <label>
          Buscar por
          <select [(ngModel)]="modo" name="modo" (ngModelChange)="limpiar()">
            @for (m of modos; track m.valor) {
              <option [value]="m.valor">{{ m.etiqueta }}</option>
            }
          </select>
        </label>

        @switch (modo) {
          @case ('timeline') {
            <label>
              Código de reserva
              <input name="reserva" type="number" min="1" [(ngModel)]="reservationId" />
            </label>
          }
          @case ('rango') {
            <label>
              Desde
              <input name="desde" type="date" [(ngModel)]="desde" />
            </label>
            <label>
              Hasta
              <input name="hasta" type="date" [(ngModel)]="hasta" />
            </label>
          }
          @case ('actor') {
            <label>
              Identificador del usuario
              <input name="actor" [(ngModel)]="actorId" />
            </label>
          }
          @case ('tipo') {
            <label>
              Tipo de evento
              <input name="tipo" placeholder="CONFIRMADA" [(ngModel)]="tipo" />
            </label>
          }
        }

        <button (click)="buscar()" [disabled]="cargando()">
          {{ cargando() ? 'Buscando…' : 'Buscar' }}
        </button>
      </div>

      @if (estado(); as e) {
        <p class="estado" [class.ok]="e < 400" [class.mal]="e >= 400">HTTP {{ e }}</p>
      }

      @if (error(); as msg) {
        <p class="error">{{ msg }}</p>
      }

      @if (eventos().length > 0) {
        <table>
          <thead>
            <tr>
              <th>Ocurrió</th><th>Evento</th><th class="num">Reserva</th>
              <th>Actor</th><th>Rol</th><th>Trace</th>
            </tr>
          </thead>
          <tbody>
            @for (e of eventos(); track e.eventId) {
              <tr>
                <td class="mono">{{ e.occurredAt }}</td>
                <td><span class="tipo">{{ e.eventType }}</span></td>
                <td class="num">{{ e.reservationId }}</td>
                <td class="mono">{{ e.actorId || '—' }}</td>
                <td>{{ e.actorRole || '—' }}</td>
                <td class="mono corto">{{ e.traceId || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else if (consultado() && !cargando() && !error()) {
        <p class="vacio">La consulta no devolvió eventos.</p>
      }
    </section>
  `,
  styles: [`
    section { font-family: system-ui, sans-serif; }
    h1 { font-size: 1.5rem; }
    .ruta { font-family: ui-monospace, monospace; font-size: .8rem; color: var(--texto-sutil); word-break: break-all; }
    .acciones { display: flex; flex-wrap: wrap; align-items: end; gap: 1rem; margin-bottom: 1rem; }
    label { display: flex; flex-direction: column; gap: .25rem; font-size: .85rem; color: var(--texto-sutil); }
    select, input { padding: .4rem .5rem; border: 1px solid var(--borde); border-radius: .3rem; }
    button { padding: .6rem 1.2rem; border: 0; border-radius: .35rem; background: var(--acento); color: #fff; cursor: pointer; }
    button:disabled { opacity: .6; cursor: default; }
    .estado { display: inline-block; padding: .3rem .7rem; border-radius: .3rem; font-family: ui-monospace, monospace; font-size: .85rem; }
    .estado.ok { background: var(--ok-fondo); color: var(--ok-texto); }
    .estado.mal { background: var(--mal-fondo); color: var(--mal-texto); }
    .error { color: var(--error); font-size: .9rem; max-width: 46rem; }
    .vacio { color: var(--texto-sutil); font-size: .9rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; font-size: .9rem; }
    th { text-align: left; padding: .5rem .75rem; background: var(--fondo-sutil); }
    td { padding: .5rem .75rem; border-bottom: 1px solid var(--borde); }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: ui-monospace, monospace; font-size: .8rem; }
    .corto { max-width: 9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tipo { background: var(--fondo-sutil); padding: .1rem .45rem; border-radius: .2rem; font-family: ui-monospace, monospace; font-size: .78rem; }
  `],
})
export class AuditComponent {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/audit`;

  readonly modos = MODOS;

  modo: Modo = 'timeline';
  reservationId: number | null = null;
  desde = '';
  hasta = '';
  actorId = '';
  tipo = '';

  readonly eventos = signal<EventoAuditoria[]>([]);
  readonly estado = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly consultado = signal(false);

  rutaActual(): string {
    switch (this.modo) {
      case 'timeline':
        return `GET ${this.base}/reservations/{id}/timeline`;
      case 'rango':
        return `GET ${this.base}/events?from=&to=`;
      case 'actor':
        return `GET ${this.base}/events/actor/{actorId}`;
      case 'tipo':
        return `GET ${this.base}/events/type/{eventType}`;
    }
  }

  limpiar(): void {
    this.eventos.set([]);
    this.estado.set(null);
    this.error.set(null);
    this.consultado.set(false);
  }

  buscar(): void {
    const peticion = this.construirPeticion();
    if (!peticion) {
      this.error.set('Falta completar el campo de búsqueda.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.eventos.set([]);

    this.http
      .get<EventoAuditoria[]>(peticion.url, { params: peticion.params, observe: 'response' })
      .subscribe({
        next: (respuesta) => {
          this.cargando.set(false);
          this.consultado.set(true);
          this.estado.set(respuesta.status);
          this.eventos.set(respuesta.body ?? []);
        },
        error: (e: HttpErrorResponse) => {
          this.cargando.set(false);
          this.consultado.set(true);
          this.estado.set(e.status);
          this.error.set(explicarError(e));
        },
      });
  }

  private construirPeticion(): { url: string; params: HttpParams } | null {
    const vacio = new HttpParams();

    switch (this.modo) {
      case 'timeline':
        if (!this.reservationId) return null;
        return { url: `${this.base}/reservations/${this.reservationId}/timeline`, params: vacio };

      case 'rango': {
        let params = vacio;
        if (this.desde) params = params.set('from', this.desde);
        if (this.hasta) params = params.set('to', this.hasta);
        return { url: `${this.base}/events`, params };
      }

      case 'actor':
        if (!this.actorId.trim()) return null;
        return { url: `${this.base}/events/actor/${encodeURIComponent(this.actorId.trim())}`, params: vacio };

      case 'tipo':
        if (!this.tipo.trim()) return null;
        return { url: `${this.base}/events/type/${encodeURIComponent(this.tipo.trim())}`, params: vacio };
    }
  }
}
