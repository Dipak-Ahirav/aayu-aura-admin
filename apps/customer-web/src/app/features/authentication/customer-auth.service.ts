import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';
import type {
  ApiResponse,
  CustomerAuthProfileDto,
  CustomerAuthResponseDto,
  CustomerLoginRequestDto,
  CustomerOAuthRequestDto,
  CustomerRegisterRequestDto,
} from '@aayu-aura/shared-types';
import { CustomerEnvironmentService } from '../../core/configuration/customer-environment.service';
import { CustomerSessionStore } from '../../state/session/customer-session.store';
import { CustomerApiService } from '../../core/api/customer-api.service';

@Injectable({ providedIn: 'root' })
export class CustomerAuthService {
  private readonly api = inject(CustomerApiService);
  private readonly http = inject(HttpClient);
  private readonly environment = inject(CustomerEnvironmentService);
  private readonly session = inject(CustomerSessionStore);

  register(body: CustomerRegisterRequestDto) {
    return this.api.post<CustomerAuthResponseDto, CustomerRegisterRequestDto>(
      '/public/customer-auth/register',
      body,
    ).pipe(
      map((response) => (response.success ? response.data : null)),
      tap((response) => this.persist(response)),
      catchError(() => of(null)),
    );
  }

  login(body: CustomerLoginRequestDto) {
    return this.api.post<CustomerAuthResponseDto, CustomerLoginRequestDto>(
      '/public/customer-auth/login',
      body,
    ).pipe(
      map((response) => (response.success ? response.data : null)),
      tap((response) => this.persist(response)),
      catchError(() => of(null)),
    );
  }

  google(body: CustomerOAuthRequestDto) {
    return this.api.post<CustomerAuthResponseDto, CustomerOAuthRequestDto>(
      '/public/customer-auth/oauth',
      body,
    ).pipe(
      map((response) => (response.success ? response.data : null)),
      tap((response) => this.persist(response)),
      catchError(() => of(null)),
    );
  }

  me() {
    const token = this.session.accessToken();
    if (!token) return of(null);
    return this.http.get<ApiResponse<CustomerAuthProfileDto>>(
      `${this.environment.apiBaseUrl}/public/customer-auth/me`,
      { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
    ).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError(() => of(null)),
    );
  }

  logout(): void {
    this.session.clear();
  }

  private persist(response: CustomerAuthResponseDto | null): void {
    if (!response) return;
    this.session.setCustomer({
      id: response.profile.id,
      name: response.profile.name,
      mobile: response.profile.mobile,
      email: response.profile.email,
      accessToken: response.accessToken,
    });
  }
}
