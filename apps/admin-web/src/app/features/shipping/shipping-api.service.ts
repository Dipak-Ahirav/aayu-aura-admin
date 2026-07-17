import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApiSuccess,
  CreateShipmentDto,
  ShipmentDto,
  ShippingListDto,
  ShipmentStatus,
  UpdateShipmentDto,
} from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ShippingListQuery {
  search?: string;
  status?: 'all' | ShipmentStatus;
  courier?: string;
  segment?: 'ready' | 'shipped' | 'delivered' | 'delayed';
  sort?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class ShippingApiService {
  private readonly http = inject(HttpClient);

  listShipments(query: ShippingListQuery = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return this.http
      .get<ApiSuccess<ShippingListDto>>(`${environment.apiBaseUrl}/shipments`, { params })
      .pipe(map((response) => response.data));
  }

  createShipment(shipment: CreateShipmentDto) {
    return this.http
      .post<ApiSuccess<ShipmentDto>>(`${environment.apiBaseUrl}/shipments`, shipment)
      .pipe(map((response) => response.data));
  }

  updateShipment(id: string, shipment: UpdateShipmentDto) {
    return this.http
      .patch<ApiSuccess<ShipmentDto>>(`${environment.apiBaseUrl}/shipments/${id}`, shipment)
      .pipe(map((response) => response.data));
  }

  cancelShipment(id: string) {
    return this.http
      .delete<ApiSuccess<ShipmentDto>>(`${environment.apiBaseUrl}/shipments/${id}`)
      .pipe(map((response) => response.data));
  }

  downloadPackingSlip(id: string) {
    return this.http.get(`${environment.apiBaseUrl}/shipments/${id}/packing-slip`, {
      responseType: 'blob',
    });
  }

  downloadOrderPackingSlip(orderId: string) {
    return this.http.get(`${environment.apiBaseUrl}/orders/${orderId}/packing-slip`, {
      responseType: 'blob',
    });
  }
}
