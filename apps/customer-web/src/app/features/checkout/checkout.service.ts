import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import type { PublicCheckoutRequestDto, PublicCheckoutResponseDto } from '@aayu-aura/shared-types';
import { CustomerApiService } from '../../core/api/customer-api.service';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly api = inject(CustomerApiService);

  placeOrder(body: PublicCheckoutRequestDto) {
    return this.api.post<PublicCheckoutResponseDto, PublicCheckoutRequestDto>(
      '/public/checkout',
      body,
    ).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError(() => of(null)),
    );
  }
}
