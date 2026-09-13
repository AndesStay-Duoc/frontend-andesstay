import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditEvent {
  id?: number;
  eventId: string;
  eventType: string;
  reservationId: number;
  unitId?: number;
  guestId?: string;
  actorId?: string;
  actorRole?: string;
  traceId?: string;
  occurredAt: string;
  persistedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {

  private base = `${environment.apiConfig.uri}/api/audit`;

  constructor(private http: HttpClient) {}

  getTimeline(reservationId: number): Observable<AuditEvent[]> {
    return this.http.get<AuditEvent[]>(`${this.base}/reservations/${reservationId}/timeline`);
  }

  getEvents(from?: string, to?: string): Observable<AuditEvent[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<AuditEvent[]>(`${this.base}/events`, { params });
  }

  getByActor(actorId: string): Observable<AuditEvent[]> {
    return this.http.get<AuditEvent[]>(`${this.base}/events/actor/${actorId}`);
  }

  getByType(type: string): Observable<AuditEvent[]> {
    return this.http.get<AuditEvent[]>(`${this.base}/events/type/${type}`);
  }
}
