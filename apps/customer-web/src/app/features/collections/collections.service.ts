import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import type { PublicCollectionListResponseDto } from '@aayu-aura/shared-types';
import { CustomerApiService } from '../../core/api/customer-api.service';

export type CollectionsQuery = {
  page?: number;
  pageSize?: number;
  sort?: string;
  fabric?: string[];
  colour?: string[];
  occasion?: string[];
  availability?: string[];
  minPrice?: number;
  maxPrice?: number;
};

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly api = inject(CustomerApiService);

  get(collectionSlug: string | null, query: CollectionsQuery) {
    const path = collectionSlug ? `/public/collections/${collectionSlug}` : '/public/collections';
    return this.api.get<PublicCollectionListResponseDto>(path, query).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError(() => of(null)),
    );
  }
}
