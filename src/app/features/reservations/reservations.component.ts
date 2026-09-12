import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

interface Reserva {
  id: string;
  unitId: string;
  guestId: string;
  fechaEntrada: string;
  fechaSalida: string;
  huespedes: number;
  estado: string;
}

/**
 * Listado de reservas. Consume el backend a traves del interceptor, que adjunta el Bearer.
 *
 * Muestra explicitamente el codigo de respuesta, incluidos 401 y 403, porque es la evidencia
 * que pide el indicador 8 de la EP2.
 */
@Component({
  selector: 'app-reservations',
  template: `
    <section>
      <h1>Reservas</h1>
      <p class="ruta">
        {{ rutaLlamada }} · rol actual: {{ roles() || '(ninguno)' }}
      </p>

      <button (click)="cargar()" [disabled]="cargando()">
        {{ cargando() ? 'Cargando…' : 'Cargar reservas' }}
      </button>

      @if (estado(); as e) {
        <p class="estado" [class.ok]="e === 200" [class.mal]="e !== 200">HTTP {{ e }}</p>
      }

      @if (error(); as msg) {
        <p class="error">{{ msg }}</p>
      }

      @if (reservas().length > 0) {
        <table>
          <thead>
            <tr><th>Código</th><th>Unidad</th><th>Entrada</th><th>Salida</th><th>Huéspedes</th><th>Estado</th></tr>
          </thead>
          <tbody>
            @for (r of reservas(); track r.id) {
              <tr>
                <td class="mono">{{ r.id }}</td>
                <td>{{ r.unitId }}</td>
                <td>{{ r.fechaEntrada }}</td>
                <td>{{ r.fechaSalida }}</td>
                <td>{{ r.huespedes }}</td>
                <td>{{ r.estado }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [`
    section { font-family: system-ui, sans-serif; }
    h1 { font-size: 1.5rem; }
    .ruta { font-family: ui-monospace, monospace; font-size: .8rem; color: var(--texto-sutil); }
    button { padding: .6rem 1.2rem; border: 0; border-radius: .35rem; background: var(--acento); color: #fff; cursor: pointer; }
    button:disabled { opacity: .6; cursor: default; }
    .estado { display: inline-block; padding: .3rem .7rem; border-radius: .3rem; font-family: ui-monospace, monospace; font-size: .85rem; }
    .estado.ok { background: var(--ok-fondo); color: var(--ok-texto); }
    .estado.mal { background: var(--mal-fondo); color: var(--mal-texto); }
    .error { color: var(--error); font-size: .9rem; max-width: 46rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; font-size: .9rem; }
    th { text-align: left; padding: .5rem .75rem; background: var(--fondo-sutil); }
    td { padding: .5rem .75rem; border-bottom: 1px solid var(--borde); }
    .mono { font-family: ui-monospace, monospace; font-size: .8rem; }
  `],
})
export class ReservationsComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly rutaLlamada = `GET ${environment.apiBaseUrl}/api/reservations`;
  readonly reservas = signal<Reserva[]>([]);
  readonly estado = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly cargando = signal(false);

  readonly roles = computed(() => this.auth.identidad()?.roles.join(', ') ?? '');

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.reservas.set([]);

    this.http
      .get<Reserva[]>(`${environment.apiBaseUrl}/api/reservations`, { observe: 'response' })
      .subscribe({
        next: (respuesta) => {
          this.cargando.set(false);
          this.estado.set(respuesta.status);
          this.reservas.set(respuesta.body ?? []);
        },
        error: (e: HttpErrorResponse) => {
          this.cargando.set(false);
          this.estado.set(e.status);
          this.error.set(this.explicar(e));
        },
      });
  }

  private explicar(e: HttpErrorResponse): string {
    const codigo = (e.error as { error?: string })?.error ?? '';
    switch (e.status) {
      case 0:
        return 'No hubo respuesta. ¿Está el BFF corriendo y con CORS habilitado para este origen?';
      case 401:
        return `401 ${codigo}: el token falta, expiró, tiene firma inválida, audience incorrecta o viene de un emisor desconocido.`;
      case 403:
        return `403 ${codigo}: el token es válido pero el rol no alcanza para esta operación.`;
      default:
        return `${e.status}: ${e.message}`;
    }
  }
}
