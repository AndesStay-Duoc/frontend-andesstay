import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

const LOGO_SRC = 'data:image/png;base64,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';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
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
          <a routerLink="/catalog" routerLinkActive="active" class="nav-item"
             *ngIf="hasRole('Admin') || hasRole('Operador')">
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
          <div class="search-wrap">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="search-icon-svg">
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input type="text" placeholder="Buscar..." class="search-input" readonly />
          </div>
          <div class="topbar-right">
            <button class="bell-btn" title="Notificaciones">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
            </button>
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
    .search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #F9F9F7;
      border: 1px solid #BFE7F4;
      border-radius: 25px;
      padding: 8px 16px;
      width: 260px;
    }
    .search-icon-svg { color: #78C1E0; flex-shrink: 0; }
    .search-input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 14px;
      color: #26729B;
      font-family: 'Nunito', inherit;
      width: 100%;
      cursor: default;
    }
    .search-input::placeholder { color: #78C1E0; }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bell-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #F9F9F7;
      border: 1px solid #BFE7F4;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #78C1E0;
      transition: all 0.15s;
    }
    .bell-btn:hover { background: #BFE7F4; color: #26729B; }
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
  private roles: string[] = [];

  constructor(private msal: MsalService, private router: Router) {}

  ngOnInit() {
    const account = this.msal.instance.getActiveAccount();
    if (account) {
      this.userName = account.name ?? account.username;
      this.roles = (account.idTokenClaims as any)?.['roles'] ?? [];
      this.primaryRole = this.roles[0] ?? 'Sin rol';
      const parts = this.userName.split(' ');
      this.shortName = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : this.userName;
      this.initials = parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
    }
  }

  hasRole(role: string): boolean { return this.roles.includes(role); }
  logout() { this.msal.logoutRedirect(); }
}