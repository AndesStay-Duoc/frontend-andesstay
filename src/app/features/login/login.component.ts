import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { TenantKey } from '../../../environments/environment.model';
import { AuthService } from '../../core/auth/auth.service';
import { seleccionarTenant, tenantConfigurado } from '../../core/auth/msal.config';
import { Rol } from '../../core/auth/roles';

/**
 * Pantalla de ingreso.
 *
 * AndesStay tiene dos tenants, asi que lo primero es elegir por cual entrar: el personal usa
 * el tenant corporativo, los huespedes el de auto-registro. La eleccion determina la authority
 * de MSAL y el grupo de rutas del API Gateway.
 *
 * Con `authMode: 'dev'` aparece ademas un selector de rol, para poder probar la autorizacion
 * de cada uno sin crear usuarios reales.
 */
@Component({
  selector: 'app-login',
  template: `
    <section class="login">
      <h1>AndesStay</h1>
      <p class="sub">Reservas de hostales, cabañas y lodges</p>

      @if (modoDev) {
        <p class="aviso">
          Modo desarrollo: los tokens los firma el emisor local del BFF. Azure no participa.
        </p>
      }

      <div class="tarjetas">
        <article>
          <h2>Soy parte del equipo</h2>
          <p>Admin, Recepcionista o Auditor. Cuenta corporativa.</p>
          @if (modoDev) {
            <label>
              Rol con el que entrar
              <select [value]="rolPersonal()" (change)="cambiarRol($event)">
                <option value="Admin">Admin</option>
                <option value="Recepcionista">Recepcionista</option>
                <option value="Auditor">Auditor</option>
              </select>
            </label>
          }
          <button (click)="entrar('staff')" [disabled]="cargando() || !disponible('staff')">
            Iniciar sesión con Microsoft
          </button>
        </article>

        <article>
          <h2>Soy huésped</h2>
          <p>Crea y sigue tus reservas.</p>
          <button (click)="entrar('guest')" [disabled]="cargando() || !disponible('guest')">
            Iniciar sesión
          </button>
          @if (!modoDev) {
            <button class="enlace" (click)="entrar('guest')" [disabled]="!disponible('guest')">
              Crear una cuenta
            </button>
          }
          @if (!disponible('guest')) {
            <p class="pendiente">Tenant sin configurar</p>
          }
        </article>
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </section>
  `,
  styles: [`
    .login { max-width: 56rem; margin: 4rem auto; padding: 0 1.5rem; font-family: system-ui, sans-serif; }
    h1 { margin: 0; font-size: 2rem; }
    .sub { color: var(--texto-sutil); margin-top: .25rem; }
    .aviso { background: var(--aviso-fondo); border-left: 3px solid var(--aviso-borde); padding: .75rem 1rem; font-size: .9rem; }
    .tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1.5rem; margin-top: 2rem; }
    article { border: 1px solid var(--borde); border-radius: .5rem; padding: 1.5rem; }
    h2 { margin: 0 0 .5rem; font-size: 1.1rem; }
    article p { color: var(--texto-sutil); font-size: .9rem; }
    label { display: block; margin: 1rem 0; font-size: .85rem; color: var(--texto-sutil); }
    select { display: block; width: 100%; margin-top: .35rem; padding: .5rem; }
    button { width: 100%; padding: .7rem; border: 0; border-radius: .35rem; background: var(--acento); color: #fff; font-size: .95rem; cursor: pointer; }
    button:disabled { opacity: .6; cursor: default; }
    .enlace { background: none; color: var(--acento); text-decoration: underline; margin-top: .5rem; }
    .error { margin-top: 1.5rem; color: var(--error); }
    .pendiente { margin: .5rem 0 0; font-size: .8rem; color: var(--aviso-texto); }
  `],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly modoDev = environment.authMode === 'dev';
  readonly rolPersonal = signal<Rol>('Recepcionista');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  cambiarRol(evento: Event): void {
    this.rolPersonal.set((evento.target as HTMLSelectElement).value as Rol);
  }

  /** Un tenant sin identificadores reales no puede usarse en modo MSAL. */
  disponible(tenant: TenantKey): boolean {
    return this.modoDev || tenantConfigurado(tenant);
  }

  entrar(tenant: TenantKey): void {
    if (!this.disponible(tenant)) {
      this.error.set(
        `El tenant de ${tenant === 'guest' ? 'huéspedes' : 'personal'} todavía no está ` +
          `configurado. Completar sus identificadores en src/environments/environment.ts ` +
          `siguiendo infra/docs/guias/azure-identidad.md.`,
      );
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    // En modo MSAL el rol lo asigna Azure: lo unico que se elige aqui es el tenant.
    // En modo dev se pide el rol al emisor local, para poder probar cada uno.
    const roles: Rol[] = this.modoDev
      ? tenant === 'guest'
        ? ['Huesped']
        : [this.rolPersonal()]
      : [];

    if (!this.modoDev) {
      seleccionarTenant(tenant);
    }

    this.auth.login(tenant, roles).subscribe({
      next: () => {
        this.cargando.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(this.mensajeDe(e));
      },
    });
  }

  private mensajeDe(e: unknown): string {
    if (this.modoDev) {
      return 'No se pudo obtener el token. ¿Está el BFF corriendo en ' +
        environment.apiBaseUrl + ' con el perfil dev?';
    }
    const mensaje = (e as { message?: string })?.message ?? '';
    return 'No se pudo iniciar sesión. ' + mensaje;
  }
}
