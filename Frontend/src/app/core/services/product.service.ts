import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ProductCreateRequestDTO } from '../models/product/product-create-request.dto';
import { ProductUpdateRequestDTO } from '../models/product/product-update-request.dto';
import { ProductDetailDTO } from '../models/product/product-detail.dto';
import { ProductListItemDTO } from '../models/product/product-list-item.dto';
import { ProductListItemDTOPagedResultDTO } from '../models/product/product-list-item-paged-result.dto';
import { FileDTO } from '../models/product/file.dto';
import { ReviewDTO } from '../models/product/review.dto';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = 'http://localhost:5255/api/Products';

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


  // ======= PRODUCTS =======
  getProductList(pageNumber: number = 1, pageSize: number = 10): Observable<ProductListItemDTO[]> {
    return this.http.get<any>(`${this.apiUrl}?pageNumber=${pageNumber}&pageSize=${pageSize}`).pipe(
      map(response => {
        // Handle both paged and direct array responses
        if (response && response.items && Array.isArray(response.items)) {
          return response.items;
        } else if (Array.isArray(response)) {
          return response;
        } else {
          console.warn('Unexpected product list response format:', response);
          return [];
        }
      })
    );
  }

  // Get products by current creator (authenticated user)
  // TODO: Replace with proper backend endpoint when available
  getMyProducts(page = 1, size = 10): Observable<ProductListItemDTO[]> {
    // For now, we'll use the main products endpoint and filter on frontend
    // This is a temporary solution until the backend provides /my-products endpoint
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}?pageNumber=${page}&pageSize=${size}`);

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

  addToWishlist(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/wishlist`, {}, { responseType: 'text' }).pipe(
      map(response => {
        return { success: true, message: response };
      })
    );
  }

  removeFromWishlist(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/wishlist`, { responseType: 'text' }).pipe(
      map(response => {
        return { success: true, message: response };
      })

    );
  }

  getWishlist(): Observable<ProductListItemDTO[]> {

    return this.http.get<any>(`${this.apiUrl}/my-wishlist`).pipe(
      map(response => {
        // Handle both paged and direct array responses
        if (response && response.items && Array.isArray(response.items)) {
          return response.items;
        } else if (Array.isArray(response)) {
          return response;
        } else {
          console.warn('Unexpected wishlist response format:', response);
          return [];
        }
      })

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


  // Check if user has purchased the product
  checkPurchaseStatus(productId: number): Observable<{ hasPurchased: boolean }> {
    return this.http.get<{ hasPurchased: boolean }>(`${this.apiUrl}/${productId}/purchase-status`);
  }

  // Get current user's review for the product
  getMyReview(productId: number): Observable<{ hasReview: boolean; review?: ReviewDTO }> {
    return this.http.get<{ hasReview: boolean; review?: ReviewDTO }>(`${this.apiUrl}/${productId}/my-review`);
  }

  // Submit a new review (only for purchased products)
  submitReview(productId: number, review: { rating: number; comment: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${productId}/reviews`, review);

  }

  // Update existing review
  updateReview(productId: number, review: { rating: number; comment: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${productId}/reviews/my-review`, review);
  }

  // Delete user's review
  deleteReview(productId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${productId}/reviews/my-review`);
  }
}
