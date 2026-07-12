import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, DashboardPeriod, DashboardSummaryDto } from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getSummary(period: DashboardPeriod) {
    return this.http
      .get<ApiSuccess<DashboardSummaryDto>>(`${environment.apiBaseUrl}/dashboard/summary`, {
        params: { period },
      })
      .pipe(map((response) => response.data));
  }
}
