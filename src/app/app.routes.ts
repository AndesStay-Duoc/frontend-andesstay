import { Routes } from '@angular/router';

import { authGuard, conRol } from './core/guards/role.guard';

/**
 * Rutas de la aplicacion.
 *
 * Los guards son comodidad de interfaz, no seguridad: la autorizacion real la aplican el API
 * Gateway y el BFF. Ver infra/docs/contracts/roles.md.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'reservations',
    canActivate: [conRol('Admin', 'Recepcionista', 'Huesped')],
    loadComponent: () =>
      import('./features/reservations/reservations.component').then((m) => m.ReservationsComponent),
  },
  {
    path: 'catalog',
    canActivate: [conRol('Admin', 'Recepcionista')],
    loadComponent: () =>
      import('./features/catalog/catalog.component').then((m) => m.CatalogComponent),
  },
  {
    path: 'reports',
    canActivate: [conRol('Admin')],
    loadComponent: () =>
      import('./features/reports/reports.component').then((m) => m.ReportsComponent),
  },
  {
    path: 'audit',
    canActivate: [conRol('Admin', 'Auditor')],
    loadComponent: () =>
      import('./features/audit/audit.component').then((m) => m.AuditComponent),
  },
  { path: '**', redirectTo: 'login' },
];
