import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, CreatePaymentDto, PaymentDto } from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly http = inject(HttpClient);

  listPayments() {
    return this.http
      .get<ApiSuccess<PaymentDto[]>>(`${environment.apiBaseUrl}/payments`)
      .pipe(map((response) => response.data));
  }

  createPayment(payment: CreatePaymentDto) {
    return this.http
      .post<ApiSuccess<PaymentDto>>(`${environment.apiBaseUrl}/payments`, payment)
      .pipe(map((response) => response.data));
  }
}
