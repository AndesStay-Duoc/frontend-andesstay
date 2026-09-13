import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Unit {
  id?: number;
  name: string;
  type: 'HABITACION' | 'CABANA' | 'LODGE';
  capacity: number;
  pricePerNight: number;
  availableSlots: number;
  description?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {

  private readonly baseUrl = `${environment.apiConfig.uri}/api/catalog/units`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Unit[]> {
    return this.http.get<Unit[]>(this.baseUrl);
  }

  getById(id: number): Observable<Unit> {
    return this.http.get<Unit>(`${this.baseUrl}/${id}`);
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
}
