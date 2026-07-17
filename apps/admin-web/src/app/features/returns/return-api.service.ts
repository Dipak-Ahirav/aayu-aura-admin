import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  CreateReturnRequestDto,
  ReturnRequestDto,
  ReturnsListDto,
  ReturnStatus,
  UpdateReturnRequestDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReturnsListQuery {
  search?: string;
  status?: 'all' | ReturnStatus;
  inspectionResult?: string;
  segment?: 'requests' | 'inspection' | 'refunds' | 'closed';
  sort?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class ReturnApiService {
  private readonly http = inject(HttpClient);

  listReturns(query: ReturnsListQuery = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return this.http
      .get<ApiSuccess<ReturnsListDto>>(`${environment.apiBaseUrl}/returns`, { params })
      .pipe(map((response) => response.data));
  }

  createReturn(payload: CreateReturnRequestDto) {
    return this.http
      .post<ApiSuccess<ReturnRequestDto>>(`${environment.apiBaseUrl}/returns`, payload)
      .pipe(map((response) => response.data));
  }

  updateReturn(id: string, payload: UpdateReturnRequestDto) {
    return this.http
      .patch<ApiSuccess<ReturnRequestDto>>(`${environment.apiBaseUrl}/returns/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  createExchange(id: string, payload: UpdateReturnRequestDto) {
    return this.http
      .post<ApiSuccess<ReturnRequestDto>>(
        `${environment.apiBaseUrl}/returns/${id}/exchange`,
        payload,
      )
      .pipe(map((response) => response.data));
  }

  cancelReturn(id: string) {
    return this.http
      .delete<ApiSuccess<ReturnRequestDto>>(`${environment.apiBaseUrl}/returns/${id}`)
      .pipe(map((response) => response.data));
  }
}
