import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, CreateOrderDto, OrderDto } from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private readonly http = inject(HttpClient);

  createOrder(order: CreateOrderDto) {
    return this.http
      .post<ApiSuccess<OrderDto>>(`${environment.apiBaseUrl}/orders`, order)
      .pipe(map((response) => response.data));
  }
}
