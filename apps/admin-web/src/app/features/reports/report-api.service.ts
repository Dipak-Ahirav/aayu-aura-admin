import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  CreateReportRunDto,
  ReportCategory,
  ReportPeriod,
  ReportRunDto,
  ReportStatus,
  ReportsListDto,
  UpdateReportRunDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReportListQuery {
  search?: string;
  category?: 'all' | ReportCategory;
  status?: 'all' | ReportStatus;
  period?: 'all' | ReportPeriod;
  sort?: string;
  page?: number;
  pageSize?: number;
}

function paramsFor(query: ReportListQuery): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params = params.set(key, String(value));
  });
  return params;
}

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private readonly http = inject(HttpClient);

  listReports(query: ReportListQuery = {}) {
    return this.http
      .get<ApiSuccess<ReportsListDto>>(`${environment.apiBaseUrl}/reports`, {
        params: paramsFor(query),
      })
      .pipe(map((response) => response.data));
  }

  exportReports(query: ReportListQuery = {}) {
    return this.http.get(`${environment.apiBaseUrl}/reports/export`, {
      params: paramsFor(query),
      responseType: 'text',
    });
  }

  createReport(payload: CreateReportRunDto) {
    return this.http
      .post<ApiSuccess<ReportRunDto>>(`${environment.apiBaseUrl}/reports`, payload)
      .pipe(map((response) => response.data));
  }

  updateReport(id: string, payload: UpdateReportRunDto) {
    return this.http
      .patch<ApiSuccess<ReportRunDto>>(`${environment.apiBaseUrl}/reports/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  archiveReport(id: string) {
    return this.http
      .delete<ApiSuccess<ReportRunDto>>(`${environment.apiBaseUrl}/reports/${id}`)
      .pipe(map((response) => response.data));
  }
}
