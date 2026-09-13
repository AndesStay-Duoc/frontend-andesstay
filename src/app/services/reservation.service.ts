import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Reservation {
  id?: number;
  guestId?: string;
  guestEmail?: string;
  unitId: number;
  checkIn: string;
  checkOut: string;
  status?: string;
  totalPrice?: number;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ReservationService {

  private readonly baseUrl = `${environment.apiConfig.uri}/api/reservations`;

  constructor(private http: HttpClient) {}

  getAll(status?: string, from?: string, to?: string): Observable<Reservation[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (from)   params = params.set('from', from);
    if (to)     params = params.set('to', to);
    return this.http.get<Reservation[]>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.baseUrl}/${id}`);
  }

  create(reservation: Reservation): Observable<Reservation> {
    return this.http.post<Reservation>(this.baseUrl, reservation);
  }

  changeStatus(id: number, status: string): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.baseUrl}/${id}/status`, { status });
  }
}
