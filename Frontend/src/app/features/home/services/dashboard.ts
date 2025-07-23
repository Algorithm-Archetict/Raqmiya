// src/app/features/home/services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Example: Get some dashboard statistics
  getDashboardStats(): Observable<any> {
    // In a real app, this would be an API call:
    // return this.http.get(`${this.apiUrl}/dashboard/stats`);

    // For now, return dummy data
    return of({
      totalProducts: 1500,
      totalUsers: 5000,
      salesToday: 250,
      revenueToday: 12500.50
    });
  }

  // Example: Get top selling products (could reuse ProductService too)
  getTopSellingProducts(): Observable<any[]> {
    // return this.http.get<any[]>(`${this.apiUrl}/dashboard/top-selling`);
    return of([
      { id: 'p1', name: 'Best Seller eBook', sales: 120 },
      { id: 'p2', name: 'Awesome Template Pack', sales: 90 }
    ]);
  }
}
