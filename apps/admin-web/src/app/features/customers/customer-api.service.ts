import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  CreateCustomerDto,
  CustomerListDto,
  UpdateCustomerDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CustomerListQuery {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  source?: string;
  customerType?: string;
  segment?: 'all' | 'outstanding' | 'repeat' | 'inactive';
  sort?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class CustomerApiService {
  private readonly http = inject(HttpClient);

  listCustomers(query: CustomerListQuery = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<ApiSuccess<CustomerListDto>>(`${environment.apiBaseUrl}/customers`, { params })
      .pipe(map((response) => response.data));
  }

  createCustomer(customer: CreateCustomerDto) {
    return this.http
      .post<ApiSuccess<CustomerListDto['items'][number]>>(
        `${environment.apiBaseUrl}/customers`,
        customer,
      )
      .pipe(map((response) => response.data));
  }

  updateCustomer(id: string, customer: UpdateCustomerDto) {
    return this.http
      .patch<ApiSuccess<CustomerListDto['items'][number]>>(
        `${environment.apiBaseUrl}/customers/${id}`,
        customer,
      )
      .pipe(map((response) => response.data));
  }

  deactivateCustomer(id: string) {
    return this.http
      .delete<ApiSuccess<CustomerListDto['items'][number]>>(
        `${environment.apiBaseUrl}/customers/${id}`,
      )
      .pipe(map((response) => response.data));
  }
}
