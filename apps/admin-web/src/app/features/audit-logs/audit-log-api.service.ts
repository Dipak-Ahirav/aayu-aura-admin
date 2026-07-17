import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  AuditLogDto,
  AuditLogListDto,
  AuditModule,
  AuditSeverity,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuditLogQuery {
  search?: string;
  tab?: 'all' | 'security' | 'inventory' | 'finance';
  module?: 'all' | AuditModule;
  action?: string;
  user?: string;
  severity?: 'all' | AuditSeverity;
  reviewed?: 'all' | 'reviewed' | 'unreviewed';
  sort?: string;
  page?: number;
  pageSize?: number;
}

function paramsFor(query: AuditLogQuery): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params = params.set(key, String(value));
  });
  return params;
}

@Injectable({ providedIn: 'root' })
export class AuditLogApiService {
  private readonly http = inject(HttpClient);

  listAuditLogs(query: AuditLogQuery = {}) {
    return this.http
      .get<ApiSuccess<AuditLogListDto>>(`${environment.apiBaseUrl}/audit-logs`, {
        params: paramsFor(query),
      })
      .pipe(map((response) => response.data));
  }

  exportAuditLogs(query: AuditLogQuery = {}) {
    return this.http.get(`${environment.apiBaseUrl}/audit-logs/export`, {
      params: paramsFor(query),
      responseType: 'text',
    });
  }

  reviewAuditLog(id: string) {
    return this.http
      .patch<ApiSuccess<AuditLogDto>>(`${environment.apiBaseUrl}/audit-logs/${id}/review`, {})
      .pipe(map((response) => response.data));
  }
}
