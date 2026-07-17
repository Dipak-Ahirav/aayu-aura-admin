import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  CreateSupplierDto,
  SupplierListDto,
  UpdateSupplierDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SupplierListQuery {
  search?: string;
  status?: 'all' | 'active' | 'payment_due' | 'inactive';
  state?: string;
  segment?: 'all' | 'outstanding' | 'inactive';
  sort?: string;
  page?: number;
  pageSize?: number;
}

function paramsFor(query: SupplierListQuery): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  });
  return params;
}

@Injectable({ providedIn: 'root' })
export class SupplierApiService {
  private readonly http = inject(HttpClient);

  listSuppliers(query: SupplierListQuery = {}) {
    return this.http
      .get<ApiSuccess<SupplierListDto>>(`${environment.apiBaseUrl}/suppliers`, {
        params: paramsFor(query),
      })
      .pipe(map((response) => response.data));
  }

  createSupplier(supplier: CreateSupplierDto) {
    return this.http
      .post<ApiSuccess<SupplierListDto['items'][number]>>(
        `${environment.apiBaseUrl}/suppliers`,
        supplier,
      )
      .pipe(map((response) => response.data));
  }

  updateSupplier(id: string, supplier: UpdateSupplierDto) {
    return this.http
      .patch<ApiSuccess<SupplierListDto['items'][number]>>(
        `${environment.apiBaseUrl}/suppliers/${id}`,
        supplier,
      )
      .pipe(map((response) => response.data));
  }

  deactivateSupplier(id: string) {
    return this.http
      .delete<ApiSuccess<SupplierListDto['items'][number]>>(
        `${environment.apiBaseUrl}/suppliers/${id}`,
      )
      .pipe(map((response) => response.data));
  }

  exportSuppliers(query: SupplierListQuery = {}) {
    return this.http.get(`${environment.apiBaseUrl}/suppliers/export`, {
      params: paramsFor(query),
      responseType: 'text',
    });
  }
}
