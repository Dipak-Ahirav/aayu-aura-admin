import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import type {
  PublicOrderTrackingDto,
  PublicOrderTrackingRequestDto,
} from '@aayu-aura/shared-types';
import { CustomerApiService } from '../../core/api/customer-api.service';
import { CustomerEnvironmentService } from '../../core/configuration/customer-environment.service';

@Injectable({ providedIn: 'root' })
export class TrackOrderService {
  private readonly api = inject(CustomerApiService);
  private readonly environment = inject(CustomerEnvironmentService);

  track(body: PublicOrderTrackingRequestDto) {
    return this.api.post<PublicOrderTrackingDto, PublicOrderTrackingRequestDto>(
      '/public/track-order',
      body,
    ).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError(() => of(null)),
    );
  }

  invoiceUrl(downloadUrl: string): string {
    return `${this.environment.apiBaseUrl}/${downloadUrl.replace(/^\//, '')}`;
  }
}
