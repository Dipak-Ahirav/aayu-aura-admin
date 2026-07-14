import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminProductDto,
  ApiSuccess,
  CreateProductDto,
  UpdateProductDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly http = inject(HttpClient);

  listProducts() {
    return this.http
      .get<ApiSuccess<AdminProductDto[]>>(`${environment.apiBaseUrl}/products`)
      .pipe(map((response) => response.data));
  }

  createProduct(product: CreateProductDto) {
    return this.http
      .post<ApiSuccess<AdminProductDto>>(`${environment.apiBaseUrl}/products`, product)
      .pipe(map((response) => response.data));
  }

  updateProduct(id: string, product: UpdateProductDto) {
    return this.http
      .patch<ApiSuccess<AdminProductDto>>(`${environment.apiBaseUrl}/products/${id}`, product)
      .pipe(map((response) => response.data));
  }
}
