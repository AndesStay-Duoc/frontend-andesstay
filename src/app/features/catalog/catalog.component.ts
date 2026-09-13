import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { explicarError } from '../../shared/http-error';

type TipoUnidad = 'HABITACION' | 'CABANA' | 'LODGE';

interface Unidad {
  id?: number;
  name: string;
  type: TipoUnidad;
  capacity: number;
  pricePerNight: number;
  availableSlots: number;
  description?: string;
  active?: boolean;
}

const TIPOS: { valor: TipoUnidad; etiqueta: string }[] = [
  { valor: 'HABITACION', etiqueta: 'Habitación' },
  { valor: 'CABANA', etiqueta: 'Cabaña' },
  { valor: 'LODGE', etiqueta: 'Lodge' },
];

/**
 * Catalogo de unidades de hospedaje.
 *
 * Leer el listado es de Admin y Recepcionista; crear es solo de Admin. El formulario se oculta
 * a quien no tiene el rol, pero eso es comodidad de interfaz: la autorizacion real la aplican el
 * API Gateway y el BFF. Si alguien llama al endpoint sin el rol, la respuesta es 403 y se
 * muestra tal cual.
 */
@Component({
  selector: 'app-catalog',
  imports: [FormsModule],
  template: `
    <section>
      <h1>Catálogo de unidades</h1>
      <p class="ruta">{{ rutaListado }} · rol actual: {{ roles() || '(ninguno)' }}</p>

      <div class="acciones">
        <button (click)="cargar()" [disabled]="cargando()">
          {{ cargando() ? 'Cargando…' : 'Cargar unidades' }}
        </button>

        <label>
          Tipo
          <select [(ngModel)]="filtro" name="filtro">
            <option value="">Todos</option>
            @for (t of tipos; track t.valor) {
              <option [value]="t.valor">{{ t.etiqueta }}</option>
            }
          </select>
        </label>

        @if (puedeCrear()) {
          <button class="secundario" (click)="alternarFormulario()">
            {{ mostrarFormulario() ? 'Cancelar' : 'Nueva unidad' }}
          </button>
        }
      </div>

      @if (estado(); as e) {
        <p class="estado" [class.ok]="e < 400" [class.mal]="e >= 400">HTTP {{ e }}</p>
      }

      @if (error(); as msg) {
        <p class="error">{{ msg }}</p>
      }

      @if (mostrarFormulario()) {
        <form class="formulario" (ngSubmit)="crear()">
          <h2>Nueva unidad</h2>
          <div class="campos">
            <label>
              Nombre
              <input name="name" [(ngModel)]="nueva.name" required />
            </label>
            <label>
              Tipo
              <select name="type" [(ngModel)]="nueva.type">
                @for (t of tipos; track t.valor) {
                  <option [value]="t.valor">{{ t.etiqueta }}</option>
                }
              </select>
            </label>
            <label>
              Capacidad
              <input name="capacity" type="number" min="1" [(ngModel)]="nueva.capacity" required />
            </label>
            <label>
              Precio por noche
              <input name="price" type="number" min="0" [(ngModel)]="nueva.pricePerNight" required />
            </label>
            <label>
              Cupos
              <input name="slots" type="number" min="0" [(ngModel)]="nueva.availableSlots" required />
            </label>
            <label class="ancha">
              Descripción
              <input name="description" [(ngModel)]="nueva.description" />
            </label>
          </div>
          <button type="submit" [disabled]="guardando()">
            {{ guardando() ? 'Guardando…' : 'Crear unidad' }}
          </button>
        </form>
      }

      @if (visibles().length > 0) {
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Tipo</th><th>Capacidad</th>
              <th class="num">Precio</th><th class="num">Cupos</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (u of visibles(); track u.id) {
              <tr>
                <td>{{ u.name }}</td>
                <td>{{ etiquetaTipo(u.type) }}</td>
                <td>{{ u.capacity }}</td>
                <td class="num">{{ u.pricePerNight }}</td>
                <td class="num" [class.agotado]="u.availableSlots === 0">{{ u.availableSlots }}</td>
                <td>{{ u.active === false ? 'Inactiva' : 'Activa' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else if (consultado() && !cargando() && !error()) {
        <p class="vacio">El catálogo no devolvió unidades para este filtro.</p>
      }
    </section>
  `,
  styles: [`
    section { font-family: system-ui, sans-serif; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1rem; margin: 0 0 .75rem; }
    .ruta { font-family: ui-monospace, monospace; font-size: .8rem; color: var(--texto-sutil); }
    .acciones { display: flex; flex-wrap: wrap; align-items: end; gap: 1rem; margin-bottom: 1rem; }
    label { display: flex; flex-direction: column; gap: .25rem; font-size: .85rem; color: var(--texto-sutil); }
    select, input { padding: .4rem .5rem; border: 1px solid var(--borde); border-radius: .3rem; }
    button { padding: .6rem 1.2rem; border: 0; border-radius: .35rem; background: var(--acento); color: #fff; cursor: pointer; }
    button:disabled { opacity: .6; cursor: default; }
    button.secundario { background: var(--fondo); color: var(--acento); border: 1px solid var(--borde); }
    .estado { display: inline-block; padding: .3rem .7rem; border-radius: .3rem; font-family: ui-monospace, monospace; font-size: .85rem; }
    .estado.ok { background: var(--ok-fondo); color: var(--ok-texto); }
    .estado.mal { background: var(--mal-fondo); color: var(--mal-texto); }
    .error { color: var(--error); font-size: .9rem; max-width: 46rem; }
    .vacio { color: var(--texto-sutil); font-size: .9rem; }
    .formulario { border: 1px solid var(--borde); border-radius: .4rem; padding: 1rem; margin-bottom: 1.5rem; max-width: 46rem; }
    .campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: .75rem; margin-bottom: 1rem; }
    .campos .ancha { grid-column: 1 / -1; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; font-size: .9rem; }
    th { text-align: left; padding: .5rem .75rem; background: var(--fondo-sutil); }
    td { padding: .5rem .75rem; border-bottom: 1px solid var(--borde); }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .agotado { color: var(--error); font-weight: 600; }
  `],
})
export class CatalogComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly url = `${environment.apiBaseUrl}/api/catalog/units`;
  readonly rutaListado = `GET ${environment.apiBaseUrl}/api/catalog/units`;
  readonly tipos = TIPOS;

  readonly unidades = signal<Unidad[]>([]);
  readonly estado = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly consultado = signal(false);
  readonly mostrarFormulario = signal(false);

  filtro = '';
  nueva: Unidad = this.unidadVacia();

  readonly roles = computed(() => this.auth.identidad()?.roles.join(', ') ?? '');
  readonly visibles = computed(() =>
    this.filtro ? this.unidades().filter((u) => u.type === this.filtro) : this.unidades(),
  );

  puedeCrear(): boolean {
    return this.auth.tiene('Admin');
  }

  etiquetaTipo(tipo: TipoUnidad): string {
    return TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
  }

  alternarFormulario(): void {
    this.mostrarFormulario.update((abierto) => !abierto);
    if (!this.mostrarFormulario()) {
      this.nueva = this.unidadVacia();
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.http.get<Unidad[]>(this.url, { observe: 'response' }).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        this.consultado.set(true);
        this.estado.set(respuesta.status);
        this.unidades.set(respuesta.body ?? []);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.consultado.set(true);
        this.unidades.set([]);
        this.estado.set(e.status);
        this.error.set(explicarError(e));
      },
    });
  }

  crear(): void {
    this.guardando.set(true);
    this.error.set(null);

    this.http.post<Unidad>(this.url, this.nueva, { observe: 'response' }).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.estado.set(respuesta.status);
        this.mostrarFormulario.set(false);
        this.nueva = this.unidadVacia();
        this.cargar();
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.estado.set(e.status);
        this.error.set(explicarError(e));
      },
    });
  }

  private unidadVacia(): Unidad {
    return {
      name: '',
      type: 'HABITACION',
      capacity: 2,
      pricePerNight: 0,
      availableSlots: 1,
      description: '',
    };
  }
}
