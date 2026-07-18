import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CustomerEnvironmentService {
  readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  readonly customerWebUrl = environment.customerWebUrl.replace(/\/$/, '');
  readonly features = environment.features;
}
