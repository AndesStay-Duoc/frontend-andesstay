import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';
import { Rol } from './core/auth/roles';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header>
      <span class="marca">AndesStay</span>
      @if (autenticado()) {
        <nav>
          <a routerLink="/dashboard">Panel</a>
          @if (puede('Admin', 'Recepcionista', 'Huesped')) {
            <a routerLink="/reservations">Reservas</a>
          }
        </nav>
        <span class="usuario">
          {{ nombre() }} · {{ roles() || 'sin rol' }}
          @if (modoDev) { <em class="dev">dev</em> }
        </span>
        <button (click)="salir()">Cerrar sesión</button>
      }
    </header>

    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    :host { display: block; font-family: system-ui, sans-serif; }
    header { display: flex; align-items: center; gap: 1.5rem; padding: .9rem 1.5rem; border-bottom: 1px solid var(--borde); }
    .marca { font-weight: 700; }
    nav { display: flex; gap: 1rem; }
    nav a { color: var(--acento); text-decoration: none; font-size: .9rem; }
    .usuario { margin-left: auto; font-size: .85rem; color: var(--texto-sutil); }
    .dev { background: var(--aviso-fondo); color: var(--aviso-texto); padding: .1rem .4rem; border-radius: .2rem; font-style: normal; font-size: .75rem; }
    button { padding: .4rem .9rem; border: 1px solid var(--borde); border-radius: .3rem; background: var(--fondo); cursor: pointer; font-size: .85rem; }
    main { padding: 2rem 1.5rem; }
  `],
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly modoDev = environment.authMode === 'dev';

  readonly identidad = this.auth.identidad;

  autenticado = computed(() => this.identidad() !== null);
  nombre = computed(() => this.identidad()?.nombre ?? '');
  roles = computed(() => this.identidad()?.roles.join(', ') ?? '');

  puede(...roles: Rol[]): boolean {
    return (this.identidad()?.roles ?? []).some((rol) => roles.includes(rol));
  }

  salir(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
