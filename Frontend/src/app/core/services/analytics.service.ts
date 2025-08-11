import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductListItemDTO } from '../models/product/product-list-item.dto';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly baseUrl = 'http://localhost:5255/api/products/carousel';

  constructor(private http: HttpClient) {}

  getMostWishedProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/most-wished?count=${count}`);
  }

  getRecommendedProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/recommended?count=${count}`);
  }

  getBestSellerProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/best-sellers?count=${count}`);
  }

  getTopRatedProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/top-rated?count=${count}`);
  }

  getNewArrivals(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/new-arrivals?count=${count}`);
  }

  getTrendingProducts(count: number = 12): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.baseUrl}/trending?count=${count}`);
  }
}
