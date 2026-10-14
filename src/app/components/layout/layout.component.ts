import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ClienteShellComponent } from './cliente-shell.component';
import { StaffShellComponent } from './staff-shell.component';

/**
 * Elige el marco según el rol y proyecta en él el único router-outlet de las rutas privadas.
 * Las rutas, los guards y los roles no cambian: los marcos solo presentan.
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, ClienteShellComponent, StaffShellComponent],
  template: `
    @if (esCliente) {
      <!-- Huésped: barra superior con navegación simple -->
      <app-cliente-shell [nombre]="shortName" [nombreCompleto]="userName" [iniciales]="initials" [rol]="primaryRole"
        [verCatalogo]="hasRole('Admin') || hasRole('Operador') || hasRole('Cliente')"
        [verReservas]="hasRole('Admin') || hasRole('Operador') || hasRole('Cliente')"
        (cerrarSesion)="logout()">
        <router-outlet></router-outlet>
      </app-cliente-shell>
    } @else {
      <!-- Personal: barra de íconos y secciones. Mismas condiciones por rol que el menú anterior. -->
      <app-staff-shell [nombre]="shortName" [nombreCompleto]="userName" [iniciales]="initials" [rol]="primaryRole"
        [verReservas]="hasRole('Admin') || hasRole('Operador') || hasRole('Cliente')"
        [verCatalogo]="hasRole('Admin') || hasRole('Operador') || hasRole('Cliente')"
        [verReportes]="hasRole('Admin')"
        [verAuditoria]="hasRole('Admin') || hasRole('Auditor')"
        (cerrarSesion)="logout()">
        <router-outlet></router-outlet>
      </app-staff-shell>
    }
  `
})
export class LayoutComponent implements OnInit {
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