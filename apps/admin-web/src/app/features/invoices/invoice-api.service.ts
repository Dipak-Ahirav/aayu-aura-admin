import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, CreateInvoiceDto, InvoiceDto } from '@aayu-aura/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InvoiceApiService {
  private readonly http = inject(HttpClient);

  listInvoices() {
    return this.http
      .get<ApiSuccess<InvoiceDto[]>>(`${environment.apiBaseUrl}/invoices`)
      .pipe(map((response) => response.data));
  }

  createInvoice(invoice: CreateInvoiceDto) {
    return this.http
      .post<ApiSuccess<InvoiceDto>>(`${environment.apiBaseUrl}/invoices`, invoice)
      .pipe(map((response) => response.data));
  }

  downloadInvoicePdf(id: string) {
    return this.http.get(`${environment.apiBaseUrl}/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
  }
}
