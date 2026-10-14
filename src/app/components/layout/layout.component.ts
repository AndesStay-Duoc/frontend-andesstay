import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ClienteShellComponent } from './cliente-shell.component';

// El logo vive en assets desde el rediseño; antes iba incrustado en base64.
const LOGO_SRC = 'assets/img/logo-andesstay.png';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ClienteShellComponent],
  template: `
    <!-- El Cliente tiene su propio marco (barra superior). El personal sigue con la barra lateral. -->
    @if (esCliente) {
      <app-cliente-shell [nombre]="shortName" [nombreCompleto]="userName" [iniciales]="initials" [rol]="primaryRole"
        [verCatalogo]="hasRole('Admin') || hasRole('Operador') || hasRole('Cliente')"
        [verReservas]="hasRole('Admin') || hasRole('Operador') || hasRole('Cliente')"
        (cerrarSesion)="logout()">
        <router-outlet></router-outlet>
      </app-cliente-shell>
    } @else {
    <div class="shell">

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="brand">
          <img class="brand-logo" [src]="logoSrc" alt="AndesStay" />
          <span class="brand-name">AndesStay</span>
        </div>

        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item"
             [routerLinkActiveOptions]="{exact:true}">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>Inicio</span>
          </a>
          <a routerLink="/reservations" routerLinkActive="active" class="nav-item"
             *ngIf="hasRole('Admin') || hasRole('Operador') || hasRole('Cliente')">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.89 3 3 3.9 3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
            <span>Reservas</span>
          </a>
          <!-- El Cliente tambien: entra en modo lectura, sin los controles de alta y edicion -->
          <a routerLink="/catalog" routerLinkActive="active" class="nav-item"
             *ngIf="hasRole('Admin') || hasRole('Operador') || hasRole('Cliente')">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/></svg>
            <span>Catálogo</span>
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item"
             *ngIf="hasRole('Admin')">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/></svg>
            <span>Reportería</span>
          </a>
          <a routerLink="/audit" routerLinkActive="active" class="nav-item"
             *ngIf="hasRole('Admin') || hasRole('Auditor')">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            <span>Auditoría</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-card">
            <div class="avatar">{{ initials }}</div>
            <div class="user-details">
              <span class="user-name">{{ shortName }}</span>
              <span class="role-pill">{{ primaryRole }}</span>
            </div>
          </div>
          <button class="logout-btn" (click)="logout()" title="Cerrar sesión">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        </div>
      </aside>

      <!-- Main -->
      <div class="main-area">

        <!-- Top bar -->
        <div class="topbar">
          <!-- Sin buscador ni campana: no tenian funcion (D7). -->
          <div class="topbar-right">
            <span class="topbar-user">{{ shortName }}</span>
            <div class="topbar-avatar">{{ initials }}</div>
          </div>
        </div>

        <!-- Page content -->
        <div class="page-content">
          <router-outlet></router-outlet>
        </div>

      </div>
    </div>
    }
  `,
  styles: [`
    * { box-sizing: border-box; }

    .shell {
      display: flex;
      height: 100vh;
      font-family: 'Nunito', 'Segoe UI', system-ui, sans-serif;
      background: #D6EEF8;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 230px;
      min-width: 230px;
      background: #26729B;
      display: flex;
      flex-direction: column;
      z-index: 10;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 24px 20px 20px;
      border-bottom: 1px solid rgba(191,231,244,0.15);
    }
    .brand-logo {
      width: 36px;
      height: 36px;
      object-fit: contain;
      filter: drop-shadow(0 0 6px rgba(191,231,244,0.4));
    }
    .brand-name {
      font-size: 17px;
      font-weight: 800;
      color: white;
      letter-spacing: -0.3px;
    }

    .nav {
      flex: 1;
      padding: 20px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 11px 14px;
      border-radius: 12px;
      text-decoration: none;
      color: rgba(191,231,244,0.7);
      font-size: 14px;
      font-weight: 600;
      transition: all 0.18s;
    }
    .nav-item:hover {
      background: rgba(191,231,244,0.1);
      color: #BFE7F4;
    }
    .nav-item.active {
      background: white;
      color: #26729B;
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    }
    .nav-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* Footer */
    .sidebar-footer {
      padding: 16px 14px;
      border-top: 1px solid rgba(191,231,244,0.15);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .user-card {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }
    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4EA8D1, #78C1E0);
      color: white;
      font-size: 12px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .user-details { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
    .user-name {
      font-size: 12px;
      color: rgba(255,255,255,0.9);
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .role-pill {
      font-size: 10px;
      padding: 1px 7px;
      border-radius: 10px;
      background: rgba(78,168,209,0.35);
      color: #BFE7F4;
      font-weight: 700;
      width: fit-content;
    }
    .logout-btn {
      background: rgba(191,231,244,0.1);
      border: none;
      color: rgba(191,231,244,0.55);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .logout-btn:hover { background: rgba(220,80,80,0.2); color: #ffaaaa; }

    /* ── Main area ── */
    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px 24px 24px 20px;
      gap: 16px;
      min-width: 0;
    }

    /* Top bar */
    .topbar {
      height: 60px;
      min-height: 60px;
      background: white;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      box-shadow: 0 2px 10px rgba(38,114,155,0.07);
    }
    .topbar-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .topbar-user {
      font-size: 14px;
      font-weight: 700;
      color: #26729B;
    }
    .topbar-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3A96C4, #78C1E0);
      color: white;
      font-size: 12px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Page content */
    .page-content {
      flex: 1;
      background: white;
      border-radius: 16px;
      overflow-y: auto;
      box-shadow: 0 2px 14px rgba(38,114,155,0.07);
      min-height: 0;
    }
  `]
})
export class LayoutComponent implements OnInit {
  logoSrc = LOGO_SRC;
  userName = '';
  shortName = '';
  initials = '';
  primaryRole = '';
  /** Scopes concedidos en el access token de la API (claim "scp"). */
  grantedScopes: string[] = [];
  private roles: string[] = [];

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    const account = this.auth.getAccount();
    if (account) {
      this.userName = account.name ?? account.username;
      this.roles = this.auth.getRoles();
      this.primaryRole = this.roles[0] ?? 'Sin rol';
      const parts = this.userName.split(' ');
      this.shortName = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : this.userName;
      this.initials = parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();

      this.auth.getScopes().subscribe(scopes => this.grantedScopes = scopes);
    }
  }

  /**
   * Solo Cliente, sin ningun rol de personal: ve el marco de huesped. Mismo criterio que usa la
   * pantalla de reservas para decidir si mostrar «solo las tuyas».
   */
  get esCliente(): boolean {
    return this.hasRole('Cliente') && !['Admin', 'Operador', 'Auditor'].some(r => this.hasRole(r));
  }

  hasRole(role: string): boolean { return this.roles.includes(role); }
  logout() { this.auth.logout(); }
}