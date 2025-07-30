// src/app/features/products/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Product, ProductCreateRequest, ProductUpdateRequest, PaginatedProducts } from '../../../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = environment.apiUrl;
  private productsUrl = `${this.apiUrl}/Products`;

  // BehaviorSubject for real-time product updates
  private _products = new BehaviorSubject<Product[]>([]);
  products$ = this._products.asObservable();

  private _currentProduct = new BehaviorSubject<Product | null>(null);
  currentProduct$ = this._currentProduct.asObservable();

  constructor(private http: HttpClient) {
    console.log('ProductService: Initialized with API URL:', this.apiUrl);
    console.log('ProductService: Products URL:', this.productsUrl);
    
    // Test backend connectivity
    this.testBackendConnection();
  }

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

  // Enhanced error handling
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = this.extractValidationErrors(error);
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in again.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'Product not found.';
          break;
        case 409:
          errorMessage = 'Product already exists with this permalink.';
          break;
        case 422:
          errorMessage = this.extractValidationErrors(error);
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.statusText}`;
      }
    }
    
    console.error('ProductService Error:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      error: error.error,
      message: errorMessage
    });
    
    return throwError(() => new Error(errorMessage));
  }

  private extractValidationErrors(error: HttpErrorResponse): string {
    if (error.error) {
      if (typeof error.error === 'string') {
        return error.error;
      } else if (error.error.message) {
        return error.error.message;
      } else if (error.error.title) {
        return error.error.title;
      } else if (error.error.detail) {
        return error.error.detail;
      } else if (error.error.errors && Array.isArray(error.error.errors)) {
        return error.error.errors.map((e: any) => e.message || e).join(', ');
      } else if (error.error.ValidationErrors && Array.isArray(error.error.ValidationErrors)) {
        return error.error.ValidationErrors.map((e: any) => e.ErrorMessage || e).join(', ');
      } else if (error.error.errors && typeof error.error.errors === 'object') {
        return Object.values(error.error.errors).flat().join(', ');
      }
    }
    return 'Validation failed. Please check your input.';
  }

  // CRUD Operations
  getProducts(page: number = 1, limit: number = 10): Observable<PaginatedProducts> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    console.log('ProductService: Getting products with params:', { page, limit });
    
    return this.http.get<PaginatedProducts>(this.productsUrl, { params }).pipe(
      tap(response => {
        console.log('ProductService: Products retrieved successfully:', response);
        this._products.next(response.items);
      }),
      catchError(error => this.handleError(error))
    );
  }

  getProductById(id: number): Observable<Product> {
    console.log('ProductService: Getting product by ID:', id);
    
    return this.http.get<Product>(`${this.productsUrl}/${id}`).pipe(
      tap(response => {
        console.log('ProductService: Product retrieved successfully:', response);
        this._currentProduct.next(response);
      }),
      catchError(error => this.handleError(error))
    );
  }

  createProduct(product: ProductCreateRequest): Observable<Product> {
    console.log('ProductService: Creating product at URL:', this.productsUrl);
    console.log('ProductService: Product payload:', product);

    // Validate required fields before sending
    const validationError = this.validateProductData(product);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    return this.http.post<Product>(this.productsUrl, product).pipe(
      tap(response => {
        console.log('ProductService: Product created successfully:', response);
        // Update the products list
        const currentProducts = this._products.getValue();
        this._products.next([...currentProducts, response]);
      }),
      catchError(error => this.handleError(error))
    );
  }

  updateProduct(id: number, updates: ProductUpdateRequest): Observable<Product> {
    console.log('ProductService: Updating product:', id);
    console.log('ProductService: Update payload:', updates);

    // Validate that we have at least some fields to update
    if (!updates || Object.keys(updates).length === 0) {
      return throwError(() => new Error('No update fields provided'));
    }

    // Validate the update payload
    const validationError = this.validateProductData(updates, true);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    return this.http.put<Product>(`${this.productsUrl}/${id}`, updates).pipe(
      tap(response => {
        console.log('ProductService: Product updated successfully:', response);
        // Update the current product and products list
        this._currentProduct.next(response);
        const currentProducts = this._products.getValue();
        const updatedProducts = currentProducts.map(p => p.id === id ? response : p);
        this._products.next(updatedProducts);
      }),
      catchError(error => this.handleError(error))
    );
  }

  deleteProduct(id: number): Observable<void> {
    console.log('ProductService: Deleting product:', id);
    
    return this.http.delete<void>(`${this.productsUrl}/${id}`).pipe(
      tap(() => {
        console.log('ProductService: Product deleted successfully:', id);
        // Remove from products list
        const currentProducts = this._products.getValue();
        const filteredProducts = currentProducts.filter(p => p.id !== id);
        this._products.next(filteredProducts);
        
        // Clear current product if it was the deleted one
        const currentProduct = this._currentProduct.getValue();
        if (currentProduct && currentProduct.id === id) {
          this._currentProduct.next(null);
        }
      }),
      catchError(error => this.handleError(error))
    );
  }

  // Validation helper
  private validateProductData(data: any, isUpdate: boolean = false): string | null {
    if (!isUpdate) {
      // Required fields for creation
      if (!data.name || data.name.trim().length < 3) {
        return 'Product name is required and must be at least 3 characters long.';
      }
      if (!data.price || data.price <= 0) {
        return 'Price is required and must be greater than 0.';
      }
      if (!data.currency || data.currency.trim().length !== 3) {
        return 'Currency is required and must be 3 characters (e.g., USD).';
      }
      if (!data.productType || data.productType.trim().length === 0) {
        return 'Product type is required.';
      }
      if (!data.permalink || !/^[a-z0-9\-_]+$/.test(data.permalink)) {
        return 'Permalink is required and must contain only lowercase letters, numbers, hyphens, and underscores.';
      }
    } else {
      // Validation for updates
      if (data.name !== undefined && (!data.name || data.name.trim().length < 3)) {
        return 'Product name must be at least 3 characters long.';
      }
      if (data.price !== undefined && (data.price <= 0)) {
        return 'Price must be greater than 0.';
      }
      if (data.currency !== undefined && (data.currency.trim().length !== 3)) {
        return 'Currency must be 3 characters (e.g., USD).';
      }
      if (data.permalink !== undefined && !/^[a-z0-9\-_]+$/.test(data.permalink)) {
        return 'Permalink must contain only lowercase letters, numbers, hyphens, and underscores.';
      }
    }
    return null;
  }

  // Additional CRUD operations
  getProductsByCreator(creatorId: string, page: number = 1, limit: number = 10): Observable<PaginatedProducts> {
    let params = new HttpParams()
      .set('creatorId', creatorId)
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    console.log('ProductService: Getting products by creator:', creatorId);
    
    return this.http.get<PaginatedProducts>(this.productsUrl, { params }).pipe(
      tap(response => {
        console.log('ProductService: Creator products retrieved successfully:', response);
        this._products.next(response.items);
      }),
      catchError(error => this.handleError(error))
    );
  }

  // Search products by name or description
  searchProducts(query: string, page: number = 1, limit: number = 10): Observable<PaginatedProducts> {
    let params = new HttpParams()
      .set('search', query)
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    console.log('ProductService: Searching products with query:', query);
    
    return this.http.get<PaginatedProducts>(this.productsUrl, { params }).pipe(
      tap(response => {
        console.log('ProductService: Search results retrieved successfully:', response);
        this._products.next(response.items);
      }),
      catchError(error => this.handleError(error))
    );
  }

  // Get products by category
  getProductsByCategory(categoryId: number, page: number = 1, limit: number = 10): Observable<PaginatedProducts> {
    let params = new HttpParams()
      .set('categoryId', categoryId.toString())
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    console.log('ProductService: Getting products by category:', categoryId);
    
    return this.http.get<PaginatedProducts>(this.productsUrl, { params }).pipe(
      tap(response => {
        console.log('ProductService: Category products retrieved successfully:', response);
        this._products.next(response.items);
      }),
      catchError(error => this.handleError(error))
    );
  }

  // Get products by tag
  getProductsByTag(tagId: number, page: number = 1, limit: number = 10): Observable<PaginatedProducts> {
    let params = new HttpParams()
      .set('tagId', tagId.toString())
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    console.log('ProductService: Getting products by tag:', tagId);
    
    return this.http.get<PaginatedProducts>(this.productsUrl, { params }).pipe(
      tap(response => {
        console.log('ProductService: Tag products retrieved successfully:', response);
        this._products.next(response.items);
      }),
      catchError(error => this.handleError(error))
    );
  }

  // Get featured products
  getFeaturedProducts(limit: number = 10): Observable<Product[]> {
    let params = new HttpParams()
      .set('featured', 'true')
      .set('limit', limit.toString());
    
    console.log('ProductService: Getting featured products');
    
    return this.http.get<Product[]>(`${this.productsUrl}/featured`, { params }).pipe(
      tap(response => {
        console.log('ProductService: Featured products retrieved successfully:', response);
        this._products.next(response);
      }),
      catchError(error => this.handleError(error))
    );
  }

  // Get trending products
  getTrendingProducts(limit: number = 10): Observable<Product[]> {
    let params = new HttpParams()
      .set('trending', 'true')
      .set('limit', limit.toString());
    
    console.log('ProductService: Getting trending products');
    
    return this.http.get<Product[]>(`${this.productsUrl}/trending`, { params }).pipe(
      tap(response => {
        console.log('ProductService: Trending products retrieved successfully:', response);
        this._products.next(response);
      }),
      catchError(error => this.handleError(error))
    );
  }

  // Wishlist operations
  addToWishlist(productId: number): Observable<void> {
    console.log('ProductService: Adding product to wishlist:', productId);
    
    return this.http.post<void>(`${this.productsUrl}/${productId}/wishlist`, {}).pipe(
      tap(() => {
        console.log('ProductService: Product added to wishlist successfully:', productId);
      }),
      catchError(error => this.handleError(error))
    );
  }

  removeFromWishlist(productId: number): Observable<void> {
    console.log('ProductService: Removing product from wishlist:', productId);
    
    return this.http.delete<void>(`${this.productsUrl}/${productId}/wishlist`).pipe(
      tap(() => {
        console.log('ProductService: Product removed from wishlist successfully:', productId);
      }),
      catchError(error => this.handleError(error))
    );
  }

  getWishlist(page: number = 1, limit: number = 10): Observable<PaginatedProducts> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    console.log('ProductService: Getting user wishlist');
    
    return this.http.get<PaginatedProducts>(`${this.productsUrl}/wishlist`, { params }).pipe(
      tap(response => {
        console.log('ProductService: Wishlist retrieved successfully:', response);
        this._products.next(response.items);
      }),
      catchError(error => this.handleError(error))
    );
  }

  // Utility methods
  clearCurrentProduct(): void {
    this._currentProduct.next(null);
  }

  refreshProducts(): void {
    this.getProducts().subscribe();
  }

  // Check if product exists by permalink
  checkPermalinkExists(permalink: string, excludeId?: number): Observable<boolean> {
    let params = new HttpParams().set('permalink', permalink);
    if (excludeId) {
      params = params.set('excludeId', excludeId.toString());
    }
    
    return this.http.get<{ exists: boolean }>(`${this.productsUrl}/check-permalink`, { params }).pipe(
      map(response => response.exists),
      catchError(error => this.handleError(error))
    );
  }
}