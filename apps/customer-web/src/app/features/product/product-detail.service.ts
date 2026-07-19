import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import type { PublicProductDetailDto } from '@aayu-aura/shared-types';
import { CustomerApiService } from '../../core/api/customer-api.service';

@Injectable({ providedIn: 'root' })
export class ProductDetailService {
  private readonly api = inject(CustomerApiService);

  get(slug: string) {
    return this.api.get<PublicProductDetailDto | null>(`/public/products/${slug}`).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError(() => of(null)),
    );
  }
}
