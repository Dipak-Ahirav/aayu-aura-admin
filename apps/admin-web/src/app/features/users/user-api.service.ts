import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminUserDto,
  ApiSuccess,
  CreateAdminUserDto,
  UserManagementListDto,
  UserRole,
  UpdateAdminUserDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserListQuery {
  search?: string;
  role?: 'all' | UserRole;
  status?: 'all' | 'active' | 'inactive';
  tab?: 'users' | 'roles' | 'permissions' | 'inactive';
  sort?: string;
  page?: number;
  pageSize?: number;
}

function paramsFor(query: UserListQuery): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params = params.set(key, String(value));
  });
  return params;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);

  listUsers(query: UserListQuery = {}) {
    return this.http
      .get<ApiSuccess<UserManagementListDto>>(`${environment.apiBaseUrl}/users`, {
        params: paramsFor(query),
      })
      .pipe(map((response) => response.data));
  }

  createUser(payload: CreateAdminUserDto) {
    return this.http
      .post<ApiSuccess<AdminUserDto>>(`${environment.apiBaseUrl}/users`, payload)
      .pipe(map((response) => response.data));
  }

  updateUser(id: string, payload: UpdateAdminUserDto) {
    return this.http
      .patch<ApiSuccess<AdminUserDto>>(`${environment.apiBaseUrl}/users/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  deactivateUser(id: string) {
    return this.http
      .delete<ApiSuccess<AdminUserDto>>(`${environment.apiBaseUrl}/users/${id}`)
      .pipe(map((response) => response.data));
  }
}
