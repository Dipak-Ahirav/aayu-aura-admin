import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  CreatePurchaseDto,
  PurchaseDto,
  PurchaseListDto,
  UpdatePurchaseDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PurchaseListQuery {
  search?: string;
  status?: 'all' | 'Draft' | 'Ordered' | 'Partially received' | 'Received' | 'Cancelled';
  supplierId?: string;
  segment?: 'all' | 'draft' | 'ordered' | 'received';
  sort?: string;
  page?: number;
  pageSize?: number;
}

function paramsFor(query: PurchaseListQuery): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  });
  return params;
}

@Injectable({ providedIn: 'root' })
export class PurchaseApiService {
  private readonly http = inject(HttpClient);

  listPurchases(query: PurchaseListQuery = {}) {
    return this.http
      .get<ApiSuccess<PurchaseListDto>>(`${environment.apiBaseUrl}/purchases`, {
        params: paramsFor(query),
      })
      .pipe(map((response) => response.data));
  }

  createPurchase(purchase: CreatePurchaseDto) {
    return this.http
      .post<ApiSuccess<PurchaseDto>>(`${environment.apiBaseUrl}/purchases`, purchase)
      .pipe(map((response) => response.data));
  }

  updatePurchase(id: string, purchase: UpdatePurchaseDto) {
    return this.http
      .patch<ApiSuccess<PurchaseDto>>(`${environment.apiBaseUrl}/purchases/${id}`, purchase)
      .pipe(map((response) => response.data));
  }

  cancelPurchase(id: string) {
    return this.http
      .delete<ApiSuccess<PurchaseDto>>(`${environment.apiBaseUrl}/purchases/${id}`)
      .pipe(map((response) => response.data));
  }
}
