import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Unit, CatalogService } from '../../services/catalog.service';

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  CABAÑA:  { icon: '🏡', color: '#0e7490', bg: '#cffafe' },
  HOSTAL:  { icon: '🏨', color: '#7c3aed', bg: '#f3e8ff' },
  SUITE:   { icon: '🛎️', color: '#b45309', bg: '#fef3c7' },
  DORM:    { icon: '🛏️', color: '#166534', bg: '#dcfce7' },
};

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Catálogo de Unidades</h1>
          <p class="page-sub">{{ filtered.length }} unidad{{ filtered.length !== 1 ? 'es' : '' }}</p>
        </div>
      </div>

      <!-- Search bar -->
      <div class="search-bar">
        <span class="search-icon">🔎</span>
        <input type="text" placeholder="Buscar por nombre o tipo…"
               [(ngModel)]="searchTerm" (input)="applyFilter()" />
        <button class="btn-clear" *ngIf="searchTerm" (click)="searchTerm=''; applyFilter()">✕</button>
      </div>

      <!-- Error -->
      <div class="alert alert-error" *ngIf="error">
        <span>⚠️</span> {{ error }}
      </div>

      <!-- Cards view -->
      <div class="unit-grid" *ngIf="filtered.length > 0">
        <div class="unit-card" *ngFor="let u of filtered">
          <div class="unit-top" [style.background]="typeMeta(u.type).bg">
            <span class="unit-emoji">{{ typeMeta(u.type).icon }}</span>
            <span class="type-tag" [style.color]="typeMeta(u.type).color"
                  [style.background]="typeMeta(u.type).bg">{{ u.type }}</span>
          </div>
          <div class="unit-body">
            <h3 class="unit-name">{{ u.name }}</h3>
            <div class="unit-stats">
              <div class="stat">
                <span class="stat-icon">👥</span>
                <span>{{ u.capacity }} pax</span>
              </div>
              <div class="stat">
                <span class="stat-icon">💰</span>
                <span>{{ u.pricePerNight | currency:'CLP':'symbol':'1.0-0' }}</span>
              </div>
              <div class="stat">
                <span class="stat-icon">🟢</span>
                <span class="slots" [class.low]="u.availableSlots === 0">
                  {{ u.availableSlots === 0 ? 'Sin cupos' : u.availableSlots + ' cupos' }}
                </span>
              </div>
            </div>
          </div>
          <div class="unit-footer">
            <span class="unit-id">#{{ u.id }}</span>
            <span class="avail-badge" [class.avail-ok]="u.availableSlots > 0" [class.avail-no]="u.availableSlots === 0">
              {{ u.availableSlots > 0 ? 'Disponible' : 'Sin disponibilidad' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div class="empty-state" *ngIf="filtered.length === 0 && !error">
        <span class="empty-icon">🏚️</span>
        <p>No se encontraron unidades.</p>
      </div>

    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }

    .page {
      padding: 36px 40px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      max-width: 1200px;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .page-title { font-size: 26px; font-weight: 800; color: #0d1f33; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    /* Search */
    .search-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 16px;
      margin-bottom: 24px;
      max-width: 400px;
    }
    .search-icon { font-size: 16px; }
    .search-bar input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 14px;
      color: #0d1f33;
      background: transparent;
    }
    .btn-clear {
      background: none; border: none; color: #94a3b8;
      cursor: pointer; font-size: 14px; padding: 2px 4px;
    }
    .btn-clear:hover { color: #475569; }

    /* Alert */
    .alert {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 10px; font-size: 14px; margin-bottom: 20px;
    }
    .alert-error { background: #fee2e2; color: #991b1b; }

    /* Unit cards */
    .unit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
    }
    .unit-card {
      background: white;
      border-radius: 14px;
      border: 1px solid #e8edf3;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
    }
    .unit-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    }
    .unit-top {
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .unit-emoji { font-size: 32px; }
    .type-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: 0.5px;
    }
    .unit-body { padding: 14px 18px; flex: 1; }
    .unit-name {
      font-size: 16px;
      font-weight: 700;
      color: #0d1f33;
      margin: 0 0 12px;
    }
    .unit-stats { display: flex; flex-direction: column; gap: 6px; }
    .stat {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #475569;
    }
    .stat-icon { font-size: 14px; width: 18px; text-align: center; }
    .slots { font-weight: 600; }
    .low { color: #dc2626; }

    .unit-footer {
      padding: 10px 18px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .unit-id { font-size: 11px; color: #94a3b8; }
    .avail-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 20px;
    }
    .avail-ok { background: #dcfce7; color: #166534; }
    .avail-no { background: #fee2e2; color: #991b1b; }

    /* Empty */
    .empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    .empty-state p { margin: 0; font-size: 15px; }
  `]
})
export class CatalogComponent implements OnInit {

  units: Unit[] = [];
  filtered: Unit[] = [];
  searchTerm = '';
  error = '';

  constructor(private svc: CatalogService) {}

  ngOnInit() {
    this.svc.getAll().subscribe({
      next: data => { this.units = data; this.applyFilter(); },
      error: () => this.error = 'No se pudo conectar con el servicio de catálogo. Verifica que el backend esté en ejecución.'
    });
  }

  typeMeta(type: string) {
    return TYPE_META[type?.toUpperCase()] ?? { icon: '🏠', color: '#1565c0', bg: '#dbeafe' };
  }

  applyFilter() {
    const q = this.searchTerm.toLowerCase();
    this.filtered = q
      ? this.units.filter(u => u.name?.toLowerCase().includes(q) || u.type?.toLowerCase().includes(q))
      : [...this.units];
  }
}