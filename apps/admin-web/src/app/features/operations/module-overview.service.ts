import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, ModuleOverviewDto, OperationalModuleSlug } from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ModuleOverviewService {
  private readonly http = inject(HttpClient);

  getOverview(slug: OperationalModuleSlug) {
    return this.http
      .get<ApiSuccess<ModuleOverviewDto>>(`${environment.apiBaseUrl}/module-overviews/${slug}`)
      .pipe(map((response) => response.data));
  }
}
