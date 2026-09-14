import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'reservations',
        loadComponent: () =>
          import('./components/reservations/reservations.component').then(m => m.ReservationsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Operador', 'Cliente'] }
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./components/catalog/catalog.component').then(m => m.CatalogComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Operador'] }
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./components/reports/reports.component').then(m => m.ReportsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin'] }
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./components/audit/audit.component').then(m => m.AuditComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Auditor'] }
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];