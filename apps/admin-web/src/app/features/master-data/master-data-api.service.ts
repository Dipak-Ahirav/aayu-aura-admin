import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  CreateMasterDataDto,
  MasterDataListDto,
  UpdateMasterDataDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MasterDataListQuery {
  search?: string;
  type?: 'all' | 'Catalogue' | 'Inventory' | 'Finance' | 'Order setup';
  status?: 'all' | 'active' | 'inactive' | 'protected';
  sort?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class MasterDataApiService {
  private readonly http = inject(HttpClient);

  listMasterData(query: MasterDataListQuery = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<ApiSuccess<MasterDataListDto>>(`${environment.apiBaseUrl}/master-data`, { params })
      .pipe(map((response) => response.data));
  }

  createMasterData(item: CreateMasterDataDto) {
    return this.http
      .post<ApiSuccess<MasterDataListDto['items'][number]>>(
        `${environment.apiBaseUrl}/master-data`,
        item,
      )
      .pipe(map((response) => response.data));
  }

  updateMasterData(id: string, item: UpdateMasterDataDto) {
    return this.http
      .patch<ApiSuccess<MasterDataListDto['items'][number]>>(
        `${environment.apiBaseUrl}/master-data/${id}`,
        item,
      )
      .pipe(map((response) => response.data));
  }

  deactivateMasterData(id: string) {
    return this.http
      .delete<ApiSuccess<MasterDataListDto['items'][number]>>(
        `${environment.apiBaseUrl}/master-data/${id}`,
      )
      .pipe(map((response) => response.data));
  }
}
