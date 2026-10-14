import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconoComponent } from '../../shared/icono/icono.component';
import { LogoComponent } from '../../shared/logo/logo.component';

/**
 * Marco de la experiencia del Cliente: barra superior con navegación simple y, en celular, una
 * barra inferior. Es solo presentación: qué enlaces se ven y cerrar sesión los decide
 * LayoutComponent, que es quien conoce los roles. La página va proyectada (ng-content).
 */
@Component({
  selector: 'app-cliente-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconoComponent, LogoComponent],
  template: `
    <header class="barra">
      <div class="fila">
        <a routerLink="/dashboard" aria-label="AndesStay, inicio"><app-logo /></a>

        <nav class="nav" aria-label="Principal">
          <a routerLink="/dashboard" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }"
             ariaCurrentWhenActive="page">
            <app-icono nombre="home" />Inicio
          </a>
          @if (verCatalogo) {
            <a routerLink="/catalog" routerLinkActive="activo" ariaCurrentWhenActive="page">
              <app-icono nombre="cottage" />Alojamientos
            </a>
          }
          @if (verReservas) {
            <a routerLink="/reservations" routerLinkActive="activo" ariaCurrentWhenActive="page">
              <app-icono nombre="event_available" />Mis reservas
            </a>
          }
        </nav>

        <div class="usuario">
          <button type="button" class="usuario-btn" (click)="menuAbierto = !menuAbierto"
                  aria-haspopup="menu" [attr.aria-expanded]="menuAbierto" aria-controls="menu-usuario">
            <span class="avatar" aria-hidden="true">{{ iniciales }}</span>
            <span class="nombre">{{ nombre }}</span>
            <app-icono [nombre]="menuAbierto ? 'expand_less' : 'expand_more'" />
            <span class="sr-only">Menú de usuario</span>
          </button>
          @if (menuAbierto) {
            <div class="menu" id="menu-usuario" role="menu">
              <div class="menu-info">
                <strong>{{ nombreCompleto }}</strong>
                <span>{{ rol }}</span>
              </div>
              <button type="button" role="menuitem" class="menu-salir" (click)="salir()">
                <app-icono nombre="logout" />Cerrar sesión
              </button>
            </div>
          }
        </div>
      </div>
    </header>

    <main class="contenido">
      <ng-content />
    </main>

    <nav class="tabs" aria-label="Principal">
      <a routerLink="/dashboard" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }"
         #inicio="routerLinkActive">
        <app-icono nombre="home" [relleno]="inicio.isActive" [tamano]="22" />Inicio
      </a>
      @if (verCatalogo) {
        <a routerLink="/catalog" routerLinkActive="activo" #cat="routerLinkActive">
          <app-icono nombre="cottage" [relleno]="cat.isActive" [tamano]="22" />Alojamientos
        </a>
      }
      @if (verReservas) {
        <a routerLink="/reservations" routerLinkActive="activo" #res="routerLinkActive">
          <app-icono nombre="event_available" [relleno]="res.isActive" [tamano]="22" />Mis reservas
        </a>
      }
    </nav>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg-page); }

    .barra { position: sticky; top: 0; z-index: 20; background: var(--c-crema); border-bottom: 1px solid var(--border); }
    .fila { display: flex; align-items: center; gap: 24px; max-width: 1180px; margin: 0 auto; padding: 10px var(--gutter); }
    .nav { display: flex; gap: 4px; }
    .nav a { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 999px; font-weight: 700; font-size: 15px; }
    .nav a:hover { background: rgba(0, 48, 73, .06); }
    .nav a.activo { background: var(--c-petroleo); color: var(--c-crema); }

    .usuario { position: relative; margin-left: auto; }
    .usuario-btn { display: flex; align-items: center; gap: 8px; padding: 4px 8px 4px 4px; border: 0; border-radius: 999px;
      background: none; cursor: pointer; font-weight: 700; font-size: 14px; }
    .usuario-btn:hover { background: rgba(0, 48, 73, .06); }
    .avatar { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%;
      background: var(--c-vino); color: var(--c-crema); font-weight: 800; font-size: 14px; }
    .menu { position: absolute; right: 0; top: calc(100% + 8px); width: 240px; padding: 8px;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-2); }
    .menu-info { display: flex; flex-direction: column; padding: 10px 12px; margin-bottom: 6px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text-muted); }
    .menu-info strong { color: var(--text); font-size: 14px; overflow-wrap: anywhere; }
    .menu-salir { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: 0; border-radius: var(--radius-sm);
      background: none; color: var(--danger); font-weight: 700; cursor: pointer; }
    .menu-salir:hover { background: #fbf3f3; }

    .contenido { flex: 1; width: 100%; max-width: 1180px; margin: 0 auto; padding: 24px var(--gutter) 64px; }

    .tabs { display: none; }

    @media (max-width: 860px) {
      .nav, .nombre { display: none; }
      .tabs { position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-around;
        padding: 6px 8px calc(6px + env(safe-area-inset-bottom)); background: var(--nav-bg); }
      .tabs a { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 72px; padding: 6px 12px;
        border-radius: 12px; color: var(--nav-icon); font-size: 12px; font-weight: 700; }
      .tabs a.activo { background: rgba(253, 240, 213, .1); color: var(--nav-icon-active); }
      .contenido { padding-bottom: 96px; }
    }
  `]
})
export class ClienteShellComponent {
  @Input() nombre = '';
  @Input() nombreCompleto = '';
  @Input() iniciales = '';
  @Input() rol = '';
  @Input() verCatalogo = false;
  @Input() verReservas = false;
  @Output() cerrarSesion = new EventEmitter<void>();

  menuAbierto = false;

  constructor(private host: ElementRef<HTMLElement>) {}

  salir() {
    this.menuAbierto = false;
    this.cerrarSesion.emit();
  }

  /** El menú se cierra al hacer clic fuera o con Escape. */
  @HostListener('document:click', ['$event'])
  alHacerClic(evento: MouseEvent) {
    if (this.menuAbierto && !this.host.nativeElement.querySelector('.usuario')?.contains(evento.target as Node)) {
      this.menuAbierto = false;
    }
  }

  @HostListener('document:keydown.escape')
  alPulsarEscape() {
    this.menuAbierto = false;
  }
}
