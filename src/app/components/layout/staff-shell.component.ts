import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { IconoComponent } from '../../shared/icono/icono.component';
import { LogoComponent } from '../../shared/logo/logo.component';

interface Seccion {
  ruta: string;
  etiqueta: string;
  icono: string;
}

/**
 * Marco del personal (Admin, Operador, Auditor): barra lateral angosta de íconos con tooltip, que
 * es la navegación principal, y barra superior con el menú de usuario, único lugar para cerrar
 * sesión. Solo presentación: qué secciones se ven lo decide LayoutComponent con los mismos roles
 * de siempre. Las partes del Panel las navega el propio Panel (llaves), no este marco.
 */
@Component({
  selector: 'app-staff-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconoComponent, LogoComponent],
  template: `
    <nav class="rail" aria-label="Secciones">
      <a routerLink="/dashboard" class="rail-logo"><app-logo variante="cuadro" /></a>
      @for (s of visibles; track s.ruta) {
        <a [routerLink]="s.ruta" routerLinkActive="activo" #rla="routerLinkActive" [routerLinkActiveOptions]="{ exact: s.ruta === '/dashboard' }"
           [attr.data-tip]="s.etiqueta" [attr.aria-label]="s.etiqueta" ariaCurrentWhenActive="page">
          <app-icono [nombre]="s.icono" [relleno]="rla.isActive" [tamano]="24" />
        </a>
      }
    </nav>

    <div class="cuerpo">
      <header class="barra">
        <nav class="migas" aria-label="Ruta">
          <span>Administración</span>
          <app-icono nombre="chevron_right" [tamano]="18" />
          <b>{{ actual?.etiqueta ?? '' }}</b>
        </nav>
        <div class="usuario">
          <button type="button" class="usuario-btn" (click)="menuAbierto = !menuAbierto"
                  aria-haspopup="menu" [attr.aria-expanded]="menuAbierto" aria-controls="menu-staff">
            <span class="avatar" aria-hidden="true">{{ iniciales }}</span>
            <span class="n"><b>{{ nombre }}</b><span class="rol">{{ rol }}</span></span>
            <app-icono [nombre]="menuAbierto ? 'expand_less' : 'expand_more'" />
            <span class="sr-only">Menú de usuario</span>
          </button>
          @if (menuAbierto) {
            <div class="menu" id="menu-staff" role="menu">
              <div class="menu-info"><b>{{ nombreCompleto }}</b><span>Rol: {{ rol }}</span></div>
              <button type="button" role="menuitem" class="menu-salir" (click)="salir()"><app-icono nombre="logout" />Cerrar sesión</button>
            </div>
          }
        </div>
      </header>
      <main class="contenido"><ng-content /></main>
    </div>
  `,
  styles: [`
    :host { display: grid; grid-template-columns: 76px 1fr; min-height: 100vh; background: var(--bg-page-admin); }

    .rail { position: sticky; top: 0; z-index: 30; height: 100vh; display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 14px 0; background: var(--nav-bg); }
    .rail-logo { margin-bottom: 14px; }
    .rail a:not(.rail-logo) { position: relative; display: grid; place-items: center; width: 48px; height: 48px;
      border: 0; border-radius: 14px; background: none; color: var(--nav-icon); cursor: pointer; }
    .rail a:not(.rail-logo):hover { background: rgba(253, 240, 213, .08); color: var(--c-crema); }
    .rail a.activo { background: var(--c-crema); color: var(--c-petroleo); }
    .rail a.activo::before { content: ''; position: absolute; left: -14px; top: 10px; bottom: 10px; width: 4px; border-radius: 0 4px 4px 0; background: var(--c-rojo); }
    /* Tooltip con el nombre: al pasar el cursor o con foco de teclado */
    [data-tip]::after { content: attr(data-tip); position: absolute; left: calc(100% + 12px); top: 50%; transform: translateY(-50%);
      padding: 6px 10px; border-radius: 8px; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity .12s;
      background: var(--c-petroleo); color: var(--c-crema); font-size: 13px; font-weight: 700; box-shadow: var(--shadow-2);
      border: 1px solid rgba(253, 240, 213, .2); }
    [data-tip]:hover::after, [data-tip]:focus-visible::after { opacity: 1; }


    .cuerpo { min-width: 0; display: flex; flex-direction: column; }
    .barra { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; padding: 10px 28px;
      background: var(--surface); border-bottom: 1px solid var(--border); }
    .migas { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text-muted); }
    .migas b { color: var(--text); }
    .usuario { position: relative; margin-left: auto; }
    .usuario-btn { display: flex; align-items: center; gap: 10px; padding: 4px 10px 4px 4px; border: 0; border-radius: 999px; background: none; cursor: pointer; }
    .usuario-btn:hover { background: rgba(0, 48, 73, .06); }
    .avatar { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: var(--c-petroleo); color: var(--c-crema); font-weight: 700; font-size: 14px; }
    .n { display: flex; flex-direction: column; text-align: left; line-height: 1.2; font-size: 14px; }
    .rol { font-size: 12px; font-weight: 700; color: var(--brand); }
    .menu { position: absolute; right: 0; top: calc(100% + 8px); width: 240px; padding: 8px; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-2); }
    .menu-info { display: flex; flex-direction: column; padding: 10px 12px; margin-bottom: 6px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text-muted); }
    .menu-info b { color: var(--text); font-size: 14px; overflow-wrap: anywhere; }
    .menu-salir { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: 0; border-radius: var(--radius-sm);
      background: none; color: var(--danger); font-weight: 700; cursor: pointer; }
    .menu-salir:hover { background: #fbf3f3; }
    .contenido { flex: 1; width: 100%; max-width: 1240px; padding: 26px 28px 60px; }

    @media (max-width: 760px) {
      :host { grid-template-columns: 1fr; }
      .rail { position: fixed; top: auto; bottom: 0; left: 0; right: 0; height: auto; flex-direction: row; justify-content: space-around;
        padding: 6px 6px calc(6px + env(safe-area-inset-bottom)); }
      .rail-logo { display: none; }
      .rail a.activo::before { left: 10px; right: 10px; top: -6px; bottom: auto; width: auto; height: 4px; border-radius: 0 0 4px 4px; }
      [data-tip]::after { display: none; }
      .barra { padding: 10px 16px; }
      .n { display: none; }
      .contenido { padding: 18px 16px 100px; }
    }
  `]
})
export class StaffShellComponent implements OnInit, OnDestroy {
  @Input() nombre = '';
  @Input() nombreCompleto = '';
  @Input() iniciales = '';
  @Input() rol = '';
  @Input() verReservas = false;
  @Input() verCatalogo = false;
  @Input() verReportes = false;
  @Input() verAuditoria = false;
  @Output() cerrarSesion = new EventEmitter<void>();

  menuAbierto = false;
  actual: Seccion | undefined;
  private sub?: Subscription;

  private readonly secciones: Seccion[] = [
    { ruta: '/dashboard', etiqueta: 'Panel', icono: 'space_dashboard' },
    { ruta: '/reservations', etiqueta: 'Reservas', icono: 'event_available' },
    { ruta: '/catalog', etiqueta: 'Catálogo', icono: 'cottage' },
    { ruta: '/reports', etiqueta: 'Reportes', icono: 'bar_chart' },
    { ruta: '/audit', etiqueta: 'Auditoría', icono: 'fact_check' },
  ];

  constructor(private router: Router, private host: ElementRef<HTMLElement>) {}

  get visibles(): Seccion[] {
    const ver: Record<string, boolean> = {
      '/dashboard': true, '/reservations': this.verReservas, '/catalog': this.verCatalogo,
      '/reports': this.verReportes, '/audit': this.verAuditoria,
    };
    return this.secciones.filter(s => ver[s.ruta]);
  }

  ngOnInit() {
    this.marcarActual(this.router.url);
    this.sub = this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.marcarActual((e as NavigationEnd).urlAfterRedirects));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private marcarActual(url: string) {
    const ruta = url.split(/[?#]/)[0];
    this.actual = this.secciones.find(s => ruta === s.ruta || ruta.startsWith(s.ruta + '/'));
    this.menuAbierto = false;
  }

  salir() {
    this.menuAbierto = false;
    this.cerrarSesion.emit();
  }

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
