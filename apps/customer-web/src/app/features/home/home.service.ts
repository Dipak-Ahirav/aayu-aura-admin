import { Injectable, inject } from '@angular/core';
import { PublicHomepageDto } from '@aayu-aura/shared-types';
import { Observable, catchError, map, of } from 'rxjs';
import { CustomerApiService } from '../../core/api/customer-api.service';

@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly api = inject(CustomerApiService);

  getHomepage(): Observable<PublicHomepageDto | null> {
    return this.api.get<PublicHomepageDto>('/public/home').pipe(
      map((response) => (response.success ? response.data : null)),
      catchError(() => of(null)),
    );
  }
}
