import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  BusinessSettingsDto,
  SettingsBackupDto,
  SettingsListDto,
  UpdateBusinessSettingsDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SettingsQuery {
  search?: string;
  section?: string;
  configured?: 'all' | 'configured' | 'partial' | 'missing';
  page?: number;
  pageSize?: number;
}

function paramsFor(query: SettingsQuery): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params = params.set(key, String(value));
  });
  return params;
}

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly http = inject(HttpClient);

  listSettings(query: SettingsQuery = {}) {
    return this.http
      .get<ApiSuccess<SettingsListDto>>(`${environment.apiBaseUrl}/settings`, {
        params: paramsFor(query),
      })
      .pipe(map((response) => response.data));
  }

  updateBusiness(payload: UpdateBusinessSettingsDto) {
    return this.http
      .patch<ApiSuccess<BusinessSettingsDto>>(
        `${environment.apiBaseUrl}/settings/business`,
        payload,
      )
      .pipe(map((response) => response.data));
  }

  createBackup(collections: string[] = []) {
    return this.http
      .post<ApiSuccess<SettingsBackupDto>>(`${environment.apiBaseUrl}/settings/backups`, {
        collections,
      })
      .pipe(map((response) => response.data));
  }

  downloadBackup(id: string) {
    return this.http.get(`${environment.apiBaseUrl}/settings/backups/${id}/file`, {
      responseType: 'text',
      observe: 'response',
    });
  }
}
