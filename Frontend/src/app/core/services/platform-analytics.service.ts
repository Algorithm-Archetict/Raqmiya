import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlatformRevenueSummaryDTO {
  totalCommission: number;
  monthlyCommission: number;
  weeklyCommission: number;
  currency: string;
  lastUpdated: string;
}

export interface MonthlyRevenuePointDTO {
  year: number;
  month: number;
  revenue: number;
  currency: string;
}

export interface TopEntityDTO {
  id: number;
  name: string;
  amount: number;
  currency: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformAnalyticsService {
  private baseUrl = `${environment.apiUrl}/platform-analytics`;

  constructor(private http: HttpClient) {}

  getSummary(currency = 'USD'): Observable<PlatformRevenueSummaryDTO> {
    return this.http.get<PlatformRevenueSummaryDTO>(`${this.baseUrl}/summary?currency=${currency}`);
  }

  getMonthlySeries(currency = 'USD'): Observable<MonthlyRevenuePointDTO[]> {
    return this.http.get<MonthlyRevenuePointDTO[]>(`${this.baseUrl}/monthly-series?currency=${currency}`);
  }

  getTopCreators(count = 10, currency = 'USD'): Observable<TopEntityDTO[]> {
    return this.http.get<TopEntityDTO[]>(`${this.baseUrl}/top-creators?count=${count}&currency=${currency}`);
  }

  getTopProducts(count = 10, currency = 'USD'): Observable<TopEntityDTO[]> {
    return this.http.get<TopEntityDTO[]>(`${this.baseUrl}/top-products?count=${count}&currency=${currency}`);
  }
}


