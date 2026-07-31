import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import type {
  PublicCheckoutRequestDto,
  PublicCheckoutResponseDto,
  PublicVerifyRazorpayPaymentRequestDto,
  PublicVerifyRazorpayPaymentResponseDto,
} from '@aayu-aura/shared-types';
import { CustomerApiService } from '../../core/api/customer-api.service';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly api = inject(CustomerApiService);
  readonly lastError = signal('');

  placeOrder(body: PublicCheckoutRequestDto) {
    this.lastError.set('');
    return this.api.post<PublicCheckoutResponseDto, PublicCheckoutRequestDto>(
      '/public/checkout',
      body,
    ).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError((error: HttpErrorResponse) => {
        const message =
          error.error?.error?.message ||
          error.error?.message ||
          'Order could not be placed. Refresh cart and try again.';
        this.lastError.set(message);
        return of(null);
      }),
    );
  }

  verifyRazorpayPayment(body: PublicVerifyRazorpayPaymentRequestDto) {
    this.lastError.set('');
    return this.api.post<PublicVerifyRazorpayPaymentResponseDto, PublicVerifyRazorpayPaymentRequestDto>(
      '/public/payments/razorpay/verify',
      body,
    ).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError((error: HttpErrorResponse) => {
        const message =
          error.error?.error?.message ||
          error.error?.message ||
          'Payment could not be verified. Please contact support with your order number.';
        this.lastError.set(message);
        return of(null);
      }),
    );
  }
}
