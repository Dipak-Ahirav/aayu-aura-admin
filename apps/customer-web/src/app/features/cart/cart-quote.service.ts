import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import type { PublicCartQuoteDto, PublicCartQuoteRequestDto } from '@aayu-aura/shared-types';
import { CustomerApiService } from '../../core/api/customer-api.service';

@Injectable({ providedIn: 'root' })
export class CartQuoteService {
  private readonly api = inject(CustomerApiService);

  quote(body: PublicCartQuoteRequestDto) {
    return this.api.post<PublicCartQuoteDto, PublicCartQuoteRequestDto>(
      '/public/cart/quote',
      body,
    ).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError(() => of(null)),
    );
  }
}
