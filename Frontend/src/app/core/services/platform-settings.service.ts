import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface CommissionDto {
  commissionPercentage: number;
}

@Injectable({ providedIn: 'root' })
export class PlatformSettingsService {
  private base = `${environment.apiUrl}/platform-settings`;
  constructor(private http: HttpClient) {}

  getCommission(): Observable<CommissionDto> {
    return this.http.get<CommissionDto>(`${this.base}/commission-percentage`);
  }

  setCommission(value: number) {
    return this.http.post(`${this.base}/commission-percentage`, { percentage: value });
  }
}
