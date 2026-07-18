import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '@aayu-aura/shared-types';
import { CustomerEnvironmentService } from '../configuration/customer-environment.service';

type QueryValue = string | number | boolean | readonly (string | number | boolean)[] | undefined;

@Injectable({ providedIn: 'root' })
export class CustomerApiService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(CustomerEnvironmentService);

  get<TData>(path: string, query?: Record<string, QueryValue>): Observable<ApiResponse<TData>> {
    return this.http.get<ApiResponse<TData>>(this.url(path), { params: this.params(query) });
  }

  post<TData, TBody extends object>(
    path: string,
    body: TBody,
  ): Observable<ApiResponse<TData>> {
    return this.http.post<ApiResponse<TData>>(this.url(path), body);
  }

  private url(path: string): string {
    return `${this.environment.apiBaseUrl}/${path.replace(/^\//, '')}`;
  }

  private params(query?: Record<string, QueryValue>): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined) continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          params = params.append(key, String(item));
        }
      } else {
        params = params.set(key, String(value));
      }
    }

    return params;
  }
}
