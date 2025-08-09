import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

import { ProductCreateRequestDTO } from '../models/product/product-create-request.dto';
import { ProductUpdateRequestDTO } from '../models/product/product-update-request.dto';
import { ProductDetailDTO } from '../models/product/product-detail.dto';
import { ProductListItemDTO } from '../models/product/product-list-item.dto';
import { ProductListItemDTOPagedResultDTO } from '../models/product/product-list-item-paged-result.dto';
import { FileDTO } from '../models/product/file.dto';
import { ReviewDTO } from '../models/product/review.dto';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = `${environment.apiUrl}/Products`;

  constructor(private http: HttpClient) {}

  // ======= CREATE =======
  createProduct(product: ProductCreateRequestDTO): Observable<ProductDetailDTO> {
    return this.http.post<ProductDetailDTO>(this.apiUrl, product).pipe(
      catchError(this.handleError('createProduct'))
    );
  }

  // ======= READ =======
  getProducts(page = 1, size = 10): Observable<ProductListItemDTOPagedResultDTO> {
    return this.http.get<ProductListItemDTOPagedResultDTO>(
      `${this.apiUrl}?pageNumber=${page}&pageSize=${size}`
    ).pipe(
      catchError(this.handleError('getProducts'))
    );
  }

  getProductList(page = 1, size = 10): Observable<ProductListItemDTO[]> {
    return this.getProducts(page, size).pipe(
      map(res => res.items || []),
      catchError(this.handleError('getProductList'))
    );
  }

  getProductById(id: number): Observable<ProductDetailDTO> {
    return this.http.get<ProductDetailDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError('getProductById'))
    );
  }

  getProductByPermalink(permalink: string): Observable<ProductDetailDTO> {
    return this.http.get<ProductDetailDTO>(`${this.apiUrl}/permalink/${permalink}`).pipe(
      catchError(this.handleError('getProductByPermalink'))
    );
  }

  // ======= UPDATE =======
  updateProduct(id: number, product: ProductUpdateRequestDTO): Observable<ProductDetailDTO> {
    return this.http.put<ProductDetailDTO>(`${this.apiUrl}/${id}`, product).pipe(
      catchError(this.handleError('updateProduct'))
    );
  }

  // ======= DELETE =======
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError('deleteProduct'))
    );
  }

  // ======= WISHLIST =======
  addToWishlist(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/wishlist`, {}).pipe(
      catchError(this.handleError('addToWishlist'))
    );
  }

  removeFromWishlist(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/wishlist`).pipe(
      catchError(this.handleError('removeFromWishlist'))
    );
  }

  getWishlist(): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/my-wishlist`).pipe(
      catchError(this.handleError('getWishlist'))
    );
  }

  // ======= ANALYTICS =======
  getMostWished(): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/analytics/most-wished`).pipe(
      catchError(this.handleError('getMostWished'))
    );
  }

  getTopRated(): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/analytics/top-rated`).pipe(
      catchError(this.handleError('getTopRated'))
    );
  }

  getBestSelling(): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/analytics/best-selling`).pipe(
      catchError(this.handleError('getBestSelling'))
    );
  }

  getTrendy(): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/analytics/trendy`).pipe(
      catchError(this.handleError('getTrendy'))
    );
  }

  // ======= FILES =======
  uploadFile(productId: number, file: File): Observable<FileDTO[]> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<FileDTO[]>(`${this.apiUrl}/${productId}/files`, formData).pipe(
      catchError(this.handleError('uploadFile'))
    );
  }

  uploadImage(productId: number, image: File, type: 'cover' | 'thumbnail'): Observable<any> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post(`${this.apiUrl}/${productId}/images?type=${type}`, formData).pipe(
      catchError(this.handleError('uploadImage'))
    );
  }

  // ======= REVIEWS =======
  addReview(productId: number, review: ReviewDTO): Observable<ReviewDTO> {
    return this.http.post<ReviewDTO>(`${this.apiUrl}/${productId}/reviews`, review);
  }

  // ======= ADMIN =======
  getProductsByStatus(status: string, page = 1, size = 10): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/admin/by-status?status=${status}&pageNumber=${page}&pageSize=${size}`).pipe(
      catchError(this.handleError('getProductsByStatus'))
    );
  }

  approveProduct(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/admin/${id}/approve`, {}).pipe(
      catchError(this.handleError('approveProduct'))
    );
  }

  rejectProduct(id: number, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/admin/${id}/reject`, { action: 'reject', reason }).pipe(
      catchError(this.handleError('rejectProduct'))
    );
  }

  // ======= CREATOR =======
  /**
   * Get products for the current creator (server infers from token)
   * Backend exposes creator listing via products with filter; if a dedicated route exists, adapt here.
   */
  getMyCreatorProducts(page = 1, size = 10): Observable<ProductListItemDTOPagedResultDTO> {
    // If backend exposes /products?creator=true, use that; otherwise, use a dedicated path if implemented.
    return this.http.get<ProductListItemDTOPagedResultDTO>(`${this.apiUrl}?pageNumber=${page}&pageSize=${size}&creator=true`).pipe(
      catchError(this.handleError('getMyCreatorProducts'))
    );
  }

  /**
   * Get products for a specific creator by ID (admin or public if permitted)
   */
  getCreatorProducts(creatorId: number, page = 1, size = 10): Observable<ProductListItemDTOPagedResultDTO> {
    return this.http.get<ProductListItemDTOPagedResultDTO>(`${this.apiUrl}?pageNumber=${page}&pageSize=${size}&creatorId=${creatorId}`).pipe(
      catchError(this.handleError('getCreatorProducts'))
    );
  }

  // ======= ERROR HANDLER =======
  private handleError(operation = 'operation') {
    return (error: any) => {
      let message = `Error in ${operation}: `;
      if (error.error && error.error.message) {
        message += error.error.message;
      } else if (error.message) {
        message += error.message;
      } else {
        message += 'Unknown error occurred.';
      }
      // Optionally log to external service
      console.error(message, error);
      return throwError(() => new Error(message));
    };
  }

  // ======= URL HELPERS =======
  /**
   * Convert a possibly relative path (e.g., /uploads/products/1/img.jpg) into a full URL
   * based on environment.apiUrl. If already absolute (http/https), returns as-is.
   */
  buildFullUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/')) {
      const base = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${base}${path}`;
    }
    return path;
  }
}
