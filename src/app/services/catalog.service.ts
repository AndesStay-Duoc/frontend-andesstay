import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getRuntimeConfig } from '../core/runtime-config';

export interface Unit {
  id?: number;
  /** Establecimiento de la red al que pertenece. Obligatorio al crear y al editar. */
  hostalId: number | null;
  name: string;
  type: 'HABITACION' | 'CABANA' | 'LODGE';
  capacity: number;
  pricePerNight: number;
  /**
   * Capacidad diaria por omisión, NO el total de plazas libres.
   *
   * Se aplica a las noches que todavía no tienen fila en el calendario. Las noches ya reservadas
   * llevan su propio conteo en `Availability`.
   */
  availableSlots: number;
  description?: string;
  active?: boolean;
}

/** Establecimiento de la red: los «20 hostales, cabañas y lodges» del caso. */
export interface Hostal {
  id?: number;
  codigo: string;
  nombre: string;
  comuna?: string;
  direccion?: string;
  activo?: boolean;
}

/** Disponibilidad de una unidad en una noche concreta. */
export interface Availability {
  id?: number;
  unitId: number;
  fecha: string;
  cuposTotales: number;
  cuposDisponibles: number;
}

export interface BusquedaUnidades {
  from?: string;
  to?: string;
  huespedes?: number;
  hostalId?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {

  private readonly baseUrl = `${getRuntimeConfig().apiUri}/api/v1/catalog/units`;
  private readonly hostalesUrl = `${getRuntimeConfig().apiUri}/api/v1/catalog/hostales`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Unit[]> {
    return this.http.get<Unit[]>(this.baseUrl);
  }

  /**
   * Busca unidades libres.
   *
   * Con `from` y `to` devuelve solo las que están disponibles TODAS las noches del rango, no las
   * que tienen alguna noche libre: una estadía que cruza una noche ocupada no se puede reservar.
   */
  buscar(filtros: BusquedaUnidades): Observable<Unit[]> {
    let params = new HttpParams();
    if (filtros.from) params = params.set('from', filtros.from);
    if (filtros.to) params = params.set('to', filtros.to);
    if (filtros.huespedes) params = params.set('huespedes', String(filtros.huespedes));
    if (filtros.hostalId) params = params.set('hostalId', String(filtros.hostalId));
    return this.http.get<Unit[]>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Unit> {
    return this.http.get<Unit>(`${this.baseUrl}/${id}`);
  }

  /** Calendario noche a noche. El día de salida no aparece: no se ocupa. */
  disponibilidad(id: number, from: string, to: string): Observable<Availability[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<Availability[]>(`${this.baseUrl}/${id}/availability`, { params });
  }

  create(unit: Unit): Observable<Unit> {
    return this.http.post<Unit>(this.baseUrl, unit);
  }

  update(id: number, unit: Unit): Observable<Unit> {
    return this.http.put<Unit>(`${this.baseUrl}/${id}`, unit);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ── Establecimientos ──────────────────────────────────────────────────────

  getHostales(): Observable<Hostal[]> {
    return this.http.get<Hostal[]>(this.hostalesUrl);
  }

  getUnidadesDeHostal(id: number): Observable<Unit[]> {
    return this.http.get<Unit[]>(`${this.hostalesUrl}/${id}/units`);
  }

  crearHostal(hostal: Hostal): Observable<Hostal> {
    return this.http.post<Hostal>(this.hostalesUrl, hostal);
  }

  actualizarHostal(id: number, hostal: Hostal): Observable<Hostal> {
    return this.http.put<Hostal>(`${this.hostalesUrl}/${id}`, hostal);
  }
}
