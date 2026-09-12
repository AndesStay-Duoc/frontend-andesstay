import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

/**
 * Panel de inicio. Muestra los claims del token decodificados.
 *
 * Es la forma mas directa de demostrar que los roles y scopes se leen del token y no estan
 * escritos en el codigo, que es lo que pide el nivel maximo del indicador 1 de la EP1.
 */
@Component({
  selector: 'app-dashboard',
  imports: [DatePipe],
  template: `
    <section>
      <h1>Panel</h1>

      @if (identidad(); as id) {
        <p>Hola, <strong>{{ id.nombre }}</strong>.</p>

        <h2>Claims del token</h2>
        <table>
          <tbody>
            <tr><th>sub</th><td>{{ id.sub }}</td></tr>
            <tr><th>roles</th><td>{{ id.roles.join(', ') || '(ninguno)' }}</td></tr>
            <tr><th>scopes</th><td>{{ id.scopes.join(', ') || '(ninguno)' }}</td></tr>
            <tr><th>issuer</th><td class="mono">{{ id.issuer }}</td></tr>
            <tr><th>audience</th><td class="mono">{{ id.audience.join(', ') }}</td></tr>
            <tr><th>expira</th><td>{{ id.expira | date: 'medium' }}</td></tr>
          </tbody>
        </table>

        @if (id.roles.length === 0) {
          <p class="aviso">
            El token no trae ningún rol. En Azure eso significa que falta asignar el rol al
            usuario en Enterprise applications, y toda ruta protegida responderá 403.
          </p>
        }
      }
    </section>
  `,
  styles: [`
    section { font-family: system-ui, sans-serif; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1rem; margin-top: 2rem; }
    table { border-collapse: collapse; width: 100%; max-width: 46rem; font-size: .9rem; }
    th { text-align: left; padding: .5rem .75rem; background: var(--fondo-sutil); width: 8rem; font-weight: 600; }
    td { padding: .5rem .75rem; border-bottom: 1px solid var(--borde); }
    .mono { font-family: ui-monospace, monospace; font-size: .8rem; word-break: break-all; }
    .aviso { background: var(--aviso-fondo); border-left: 3px solid var(--aviso-borde); padding: .75rem 1rem; font-size: .9rem; max-width: 46rem; }
  `],
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  readonly identidad = this.auth.identidad;
}
