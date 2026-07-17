import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  CreateStockMovementDto,
  InventoryListDto,
  InventorySegment,
  UpdateStockMovementDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InventoryListQuery {
  search?: string;
  segment?: InventorySegment;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  warehouse?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);

  listInventory(query: InventoryListQuery = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<ApiSuccess<InventoryListDto>>(`${environment.apiBaseUrl}/inventory`, { params })
      .pipe(map((response) => response.data));
  }

  createMovement(movement: CreateStockMovementDto) {
    return this.http
      .post<ApiSuccess<InventoryListDto['movements'][number]>>(
        `${environment.apiBaseUrl}/stock-transactions`,
        movement,
      )
      .pipe(map((response) => response.data));
  }

  updateMovement(id: string, movement: UpdateStockMovementDto) {
    return this.http
      .patch<ApiSuccess<InventoryListDto['movements'][number]>>(
        `${environment.apiBaseUrl}/stock-transactions/${id}`,
        movement,
      )
      .pipe(map((response) => response.data));
  }

  reverseMovement(id: string) {
    return this.http
      .delete<ApiSuccess<InventoryListDto['movements'][number]>>(
        `${environment.apiBaseUrl}/stock-transactions/${id}`,
      )
      .pipe(map((response) => response.data));
  }
}
