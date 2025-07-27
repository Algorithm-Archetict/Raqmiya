// src/app/features/products/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Product, ProductCreateRequest, ProductUpdateRequest, PaginatedProducts } from '../../../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = environment.apiUrl;
  private productsUrl = `${this.apiUrl}/product`; // Base URL for product endpoints

  constructor(private http: HttpClient) {}

  getProducts(page: number = 1, limit: number = 10): Observable<PaginatedProducts> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<PaginatedProducts>(this.productsUrl, { params });
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.productsUrl}/${id}`);
  }

  createProduct(product: ProductCreateRequest): Observable<Product> {
    return this.http.post<Product>(this.productsUrl, product);
  }

  updateProduct(id: string, product: ProductUpdateRequest): Observable<Product> {
    return this.http.put<Product>(`${this.productsUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.productsUrl}/${id}`);
  }

  getProductsByCreator(creatorId: string, page: number = 1, limit: number = 10): Observable<PaginatedProducts> {
    let params = new HttpParams()
      .set('creatorId', creatorId)
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<PaginatedProducts>(this.productsUrl, { params });
  }

  // Add methods for searching, filtering, adding to wishlist, etc.
}