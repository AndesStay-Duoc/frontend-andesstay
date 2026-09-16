import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getRuntimeConfig } from '../core/runtime-config';

@Injectable({ providedIn: 'root' })
export class ReportService {

  private readonly baseUrl = `${getRuntimeConfig().apiUri}/api/report`;

  constructor(private http: HttpClient) {}

  getKpis(range: string = 'last24h'): Observable<any> {
    return this.http.get(`${this.baseUrl}/kpis`, { params: new HttpParams().set('range', range) });
  }

  getTopUnits(range: string = 'last7d'): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/top-units`, { params: new HttpParams().set('range', range) });
  }
}
