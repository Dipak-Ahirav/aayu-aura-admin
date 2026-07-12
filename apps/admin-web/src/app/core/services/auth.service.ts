import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { ApiSuccess, UserProfileDto } from '@aayu-aura/shared-types';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  profile: UserProfileDto;
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'aa_access_token';
  private readonly profileState = signal<UserProfileDto | null>(null);

  readonly profile = this.profileState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.profileState() || this.token));

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string) {
    return this.http
      .post<ApiSuccess<LoginResponse>>(`${environment.apiBaseUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          localStorage.setItem(this.tokenKey, response.data.accessToken);
          this.profileState.set(response.data.profile);
        }),
      );
  }

  loadCurrentUser() {
    return this.http.get<ApiSuccess<UserProfileDto>>(`${environment.apiBaseUrl}/auth/me`).pipe(
      tap((response) => {
        this.profileState.set(response.data);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.profileState.set(null);
    void this.router.navigateByUrl('/login');
  }
}
