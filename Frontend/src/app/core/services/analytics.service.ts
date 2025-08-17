import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductListItemDTO } from '../models/product/product-list-item.dto';
import { AuthService } from './auth.service';

export interface DiscoverFeedResponse {
  mostWished: ProductListItemDTO[];
  recommended: ProductListItemDTO[];
  bestSellers: ProductListItemDTO[];
  topRated: ProductListItemDTO[];
  newArrivals: ProductListItemDTO[];
  trending: ProductListItemDTO[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly baseUrl = 'http://localhost:5255/api/products';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Create HTTP headers with authentication token if user is logged in
   */
  private createAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get all analytics data for the discover page in a single optimized call
   */
  getDiscoverFeed(countPerSection: number = 12): Observable<DiscoverFeedResponse> {
    const headers = this.createAuthHeaders();
    return this.http.get<DiscoverFeedResponse>(`${this.baseUrl}/discover?countPerSection=${countPerSection}`, { headers });
  }

  /**
   * Individual analytics endpoints for specific use cases
   */
  getMostWishedProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    const headers = this.createAuthHeaders();
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/most-wished?count=${count}`, { headers });
  }

  getRecommendedProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    const headers = this.createAuthHeaders();
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/recommended?count=${count}`, { headers });
  }

  getBestSellerProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    const headers = this.createAuthHeaders();
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/best-sellers?count=${count}`, { headers });
  }

  getTopRatedProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    const headers = this.createAuthHeaders();
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/top-rated?count=${count}`, { headers });
  }

  getNewArrivals(count: number = 12): Observable<ProductListItemDTO[]> {
    const headers = this.createAuthHeaders();
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/new-arrivals?count=${count}`, { headers });
  }

  getTrendingProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    const headers = this.createAuthHeaders();
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/trending?count=${count}`, { headers });
  }

  // Paginated analytics methods for category filtering
  getPaginatedTopRatedProducts(pageNumber: number = 1, pageSize: number = 12): Observable<any> {
    const headers = this.createAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/analytics/top-rated?pageNumber=${pageNumber}&pageSize=${pageSize}`, { headers });
  }

  getPaginatedMostWishedProducts(pageNumber: number = 1, pageSize: number = 12): Observable<any> {
    const headers = this.createAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/analytics/most-wished?pageNumber=${pageNumber}&pageSize=${pageSize}`, { headers });
  }

  getPaginatedBestSellingProducts(pageNumber: number = 1, pageSize: number = 12): Observable<any> {
    const headers = this.createAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/analytics/best-selling?pageNumber=${pageNumber}&pageSize=${pageSize}`, { headers });
  }

  getPaginatedNewArrivals(pageNumber: number = 1, pageSize: number = 12): Observable<any> {
    const headers = this.createAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/analytics/new-arrivals?pageNumber=${pageNumber}&pageSize=${pageSize}`, { headers });
  }

  getPaginatedTrendingProducts(pageNumber: number = 1, pageSize: number = 12): Observable<any> {
    const headers = this.createAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/analytics/trending?pageNumber=${pageNumber}&pageSize=${pageSize}`, { headers });
  }
}
