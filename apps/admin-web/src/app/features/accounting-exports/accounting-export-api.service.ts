import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AccountingExportDto,
  AccountingExportFormat,
  AccountingExportListDto,
  AccountingExportStatus,
  AccountingVoucherType,
  ApiSuccess,
  CreateAccountingExportDto,
  CreateLedgerMappingDto,
  LedgerMappingDto,
  UpdateAccountingExportDto,
  UpdateLedgerMappingDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccountingExportQuery {
  search?: string;
  tab?: 'mappings' | 'ready' | 'history' | 'errors';
  voucherType?: 'all' | AccountingVoucherType;
  status?: 'all' | AccountingExportStatus;
  format?: 'all' | AccountingExportFormat;
  sort?: string;
  page?: number;
  pageSize?: number;
}

function paramsFor(query: AccountingExportQuery): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params = params.set(key, String(value));
  });
  return params;
}

@Injectable({ providedIn: 'root' })
export class AccountingExportApiService {
  private readonly http = inject(HttpClient);

  listAccountingExports(query: AccountingExportQuery = {}) {
    return this.http
      .get<ApiSuccess<AccountingExportListDto>>(`${environment.apiBaseUrl}/accounting-exports`, {
        params: paramsFor(query),
      })
      .pipe(map((response) => response.data));
  }

  createMapping(payload: CreateLedgerMappingDto) {
    return this.http
      .post<ApiSuccess<LedgerMappingDto>>(`${environment.apiBaseUrl}/accounting-mappings`, payload)
      .pipe(map((response) => response.data));
  }

  updateMapping(id: string, payload: UpdateLedgerMappingDto) {
    return this.http
      .patch<ApiSuccess<LedgerMappingDto>>(
        `${environment.apiBaseUrl}/accounting-mappings/${id}`,
        payload,
      )
      .pipe(map((response) => response.data));
  }

  deactivateMapping(id: string) {
    return this.http
      .delete<ApiSuccess<LedgerMappingDto>>(`${environment.apiBaseUrl}/accounting-mappings/${id}`)
      .pipe(map((response) => response.data));
  }

  createExport(payload: CreateAccountingExportDto) {
    return this.http
      .post<ApiSuccess<AccountingExportDto>>(
        `${environment.apiBaseUrl}/accounting-exports`,
        payload,
      )
      .pipe(map((response) => response.data));
  }

  updateExport(id: string, payload: UpdateAccountingExportDto) {
    return this.http
      .patch<ApiSuccess<AccountingExportDto>>(
        `${environment.apiBaseUrl}/accounting-exports/${id}`,
        payload,
      )
      .pipe(map((response) => response.data));
  }

  archiveExport(id: string) {
    return this.http
      .delete<ApiSuccess<AccountingExportDto>>(`${environment.apiBaseUrl}/accounting-exports/${id}`)
      .pipe(map((response) => response.data));
  }

  downloadExport(id: string) {
    return this.http.get(`${environment.apiBaseUrl}/accounting-exports/${id}/file`, {
      responseType: 'text',
      observe: 'response',
    });
  }
}
