import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  CreateExpenseDto,
  ExpenseDto,
  ExpenseListDto,
  ExpenseStatus,
  UpdateExpenseDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ExpenseListQuery {
  search?: string;
  status?: 'all' | ExpenseStatus;
  category?: string;
  paymentMethod?: string;
  segment?: 'all' | 'draft' | 'approved' | 'rejected';
  sort?: string;
  page?: number;
  pageSize?: number;
}

function paramsFor(query: ExpenseListQuery): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params = params.set(key, String(value));
  });
  return params;
}

@Injectable({ providedIn: 'root' })
export class ExpenseApiService {
  private readonly http = inject(HttpClient);

  listExpenses(query: ExpenseListQuery = {}) {
    return this.http
      .get<ApiSuccess<ExpenseListDto>>(`${environment.apiBaseUrl}/expenses`, {
        params: paramsFor(query),
      })
      .pipe(map((response) => response.data));
  }

  exportExpenses(query: ExpenseListQuery = {}) {
    return this.http.get(`${environment.apiBaseUrl}/expenses/export`, {
      params: paramsFor(query),
      responseType: 'text',
    });
  }

  createExpense(payload: CreateExpenseDto) {
    return this.http
      .post<ApiSuccess<ExpenseDto>>(`${environment.apiBaseUrl}/expenses`, payload)
      .pipe(map((response) => response.data));
  }

  updateExpense(id: string, payload: UpdateExpenseDto) {
    return this.http
      .patch<ApiSuccess<ExpenseDto>>(`${environment.apiBaseUrl}/expenses/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  cancelExpense(id: string) {
    return this.http
      .delete<ApiSuccess<ExpenseDto>>(`${environment.apiBaseUrl}/expenses/${id}`)
      .pipe(map((response) => response.data));
  }
}
