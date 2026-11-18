import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getRuntimeConfig } from '../core/runtime-config';

@Injectable({ providedIn: 'root' })
export class ReportService {

  private readonly baseUrl = `${getRuntimeConfig().apiUri}/api/v1/report`;

  constructor(private http: HttpClient) {}

  getKpis(range: string = 'last24h'): Observable<any> {
    return this.http.get(`${this.baseUrl}/kpis`, { params: new HttpParams().set('range', range) });
  }

  getTopUnits(range: string = 'last7d'): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/top-units`, { params: new HttpParams().set('range', range) });
  }

  /**
   * Los mismos KPIs, pero leídos del estado que Kafka Streams mantiene al día en el servicio de
   * reportes, en vez de consultados a la base.
   *
   * Es lo que permite refrescar la pantalla cada pocos segundos: getKpis() recorre el histórico en
   * cada llamada y su coste crece con los datos, mientras que esto lee un valor ya calculado y
   * responde igual con un evento que con un millón.
   *
   * Añade además el tiempo de ciclo, que el histórico no calcula. Si la topología no está
   * corriendo, la respuesta trae disponible=false en lugar de ceros.
   */
  getKpisEnVivo(range: string = 'last24h'): Observable<any> {
    return this.http.get(`${this.baseUrl}/kpis/live`, { params: new HttpParams().set('range', range) });
  }
}
