import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import type { PublicProductListResponseDto } from '@aayu-aura/shared-types';
import { CustomerApiService } from '../../core/api/customer-api.service';

export type CatalogueQuery = {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  category?: string[];
  sareeType?: string[];
  fabric?: string[];
  colour?: string[];
  occasion?: string[];
  pattern?: string[];
  discount?: string[];
  availability?: string[];
  minPrice?: number;
  maxPrice?: number;
};

@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private readonly api = inject(CustomerApiService);

  list(query: CatalogueQuery) {
    return this.api.get<PublicProductListResponseDto>('/public/products', query).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError(() => of(null)),
    );
  }
}
