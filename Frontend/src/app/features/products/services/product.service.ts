// src/app/features/products/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Product, ProductCreateRequest, ProductUpdateRequest, PaginatedProducts } from '../../../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = environment.apiUrl;
  private productsUrl = `${this.apiUrl}/Products`; // Fix: Use 'Products' (plural) to match backend controller

  constructor(private http: HttpClient) {
    // Test backend connection on service initialization
    console.log('ProductService: Initialized with API URL:', this.apiUrl);
    console.log('ProductService: Products URL:', this.productsUrl);
  }

  getProducts(page: number = 1, limit: number = 10): Observable<PaginatedProducts> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<PaginatedProducts>(this.productsUrl, { params });
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.productsUrl}/${id}`);
  }

  createProduct(product: ProductCreateRequest): Observable<Product> {
    console.log('ProductService: Creating product at URL:', this.productsUrl);
    console.log('ProductService: Product payload:', product);
    console.log('ProductService: Product payload JSON:', JSON.stringify(product, null, 2));
    
    // Validate required fields before sending
    if (!product.name || !product.price || !product.currency || !product.productType || !product.permalink) {
      console.error('ProductService: Missing required fields:', {
        name: !!product.name,
        price: !!product.price,
        currency: !!product.currency,
        productType: !!product.productType,
        permalink: !!product.permalink
      });
      return throwError(() => new Error('Missing required fields'));
    }
    
    // Send JSON payload for product creation (files will be uploaded separately)
    return this.http.post<Product>(this.productsUrl, product);
  }

  updateProduct(id: number, updates: Partial<ProductUpdateRequest>): Observable<Product> {
    console.log('ProductService: Updating product:', id, 'with updates:', updates);
    return this.http.put<Product>(`${this.productsUrl}/${id}`, updates);
  }

  deleteProduct(id: number): Observable<void> {
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

  // Test method to check backend connectivity
  public testBackendConnection(): Observable<any> {
    console.log('ProductService: Testing backend connection...');
    return this.http.get(`${this.apiUrl}/Products`).pipe(
      tap(response => {
        console.log('ProductService: Backend connection successful:', response);
      }),
      catchError(error => {
        console.error('ProductService: Backend connection failed:', error);
        return throwError(() => error);
      })
    );
  }
}