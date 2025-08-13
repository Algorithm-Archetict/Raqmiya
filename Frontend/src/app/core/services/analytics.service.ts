import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductListItemDTO } from '../models/product/product-list-item.dto';

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

  constructor(private http: HttpClient) {}

  /**
   * Get all analytics data for the discover page in a single optimized call
   */
  getDiscoverFeed(countPerSection: number = 12): Observable<DiscoverFeedResponse> {
    return this.http.get<DiscoverFeedResponse>(`${this.baseUrl}/discover-feed?countPerSection=${countPerSection}`);
  }

  /**
   * Individual analytics endpoints for specific use cases
   */
  getMostWishedProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/most-wished?count=${count}`);
  }

  getRecommendedProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/recommended?count=${count}`);
  }

  getBestSellerProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/best-sellers?count=${count}`);
  }

  getTopRatedProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/top-rated?count=${count}`);
  }

  getNewArrivals(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/new-arrivals?count=${count}`);
  }

  getTrendingProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/carousel/trending?count=${count}`);
  }
}
