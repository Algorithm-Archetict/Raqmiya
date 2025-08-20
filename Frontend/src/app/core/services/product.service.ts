import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { ProductCreateRequestDTO } from '../models/product/product-create-request.dto';
import { ProductUpdateRequestDTO } from '../models/product/product-update-request.dto';
import { ProductDetailDTO } from '../models/product/product-detail.dto';
import { ProductListItemDTO } from '../models/product/product-list-item.dto';
import { ProductListItemDTOPagedResultDTO } from '../models/product/product-list-item-paged-result.dto';
import { ProductModerationRequestDTO } from '../models/product/product-moderation-request.dto';
import { FileDTO } from '../models/product/file.dto';
import { ReviewDTO } from '../models/product/review.dto';
import { Receipt } from '../interfaces/receipt.interface';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = `${environment.apiUrl}/Products`;
  // Simple in-memory caches to avoid repeated network calls
  private allCacheKey = 'all:page=1:size=1000';
  private cache = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) {}

  // ======= CREATE =======
  createProduct(product: ProductCreateRequestDTO): Observable<ProductDetailDTO> {
    return this.http.post<ProductDetailDTO>(this.apiUrl, product);
  }

  // ======= READ =======
  getAll(page = 1, size = 10): Observable<ProductListItemDTOPagedResultDTO> {
    const key = `all:page=${page}:size=${size}`;
    if (!this.cache.has(key)) {
      const req$ = this.http
        .get<ProductListItemDTOPagedResultDTO>(`${this.apiUrl}?pageNumber=${page}&pageSize=${size}`)
        .pipe(shareReplay(1));
      this.cache.set(key, req$);
    }
    return this.cache.get(key) as Observable<ProductListItemDTOPagedResultDTO>;
  }

  // ======= PRODUCTS =======
   getProductList(pageNumber: number = 1, pageSize: number = 10): Observable<ProductListItemDTO[]> {
    const key = `list:page=${pageNumber}:size=${pageSize}`;
    if (!this.cache.has(key)) {
      const req$ = this.http.get<any>(`${this.apiUrl}?pageNumber=${pageNumber}&pageSize=${pageSize}`).pipe(
        map(response => {
          if (response && response.items && Array.isArray(response.items)) {
            return response.items;
          } else if (Array.isArray(response)) {
            return response;
          } else {
            console.warn('Unexpected product list response format:', response);
            return [];
          }
        }),
        shareReplay(1)
      );
      this.cache.set(key, req$);
    }
    return this.cache.get(key) as Observable<ProductListItemDTO[]>;
  }

  // Get products by current creator (authenticated user)
  getMyProducts(page = 1, size = 10): Observable<ProductListItemDTO[]> {
    return this.http.get<any>(`${this.apiUrl}/my-products?pageNumber=${page}&pageSize=${size}`).pipe(
      map(response => {
        if (response && response.items && Array.isArray(response.items)) {
          return response.items;
        } else if (Array.isArray(response)) {
          return response;
        } else {
          return [];
        }
      })
    );
    // return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}?pageNumber=${page}&pageSize=${size}`);
  }

  

  getById(id: number): Observable<ProductDetailDTO> {
    return this.http.get<ProductDetailDTO>(`${this.apiUrl}/${id}`);
  }

  getByPermalink(permalink: string): Observable<ProductDetailDTO> {
    return this.http.get<ProductDetailDTO>(`${this.apiUrl}/permalink/${permalink}`);
  }

  // ======= UPDATE =======
  updateProduct(id: number, product: ProductUpdateRequestDTO): Observable<ProductDetailDTO> {
    return this.http.put<ProductDetailDTO>(`${this.apiUrl}/${id}`, product);
  }

  // ======= DELETE =======
  deleteProduct(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
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
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/analytics/most-wished`);
  }

  getTopRated(): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/analytics/top-rated`);
  }

  getBestSelling(): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/analytics/best-selling`);
  }

  getTrendy(): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/analytics/trendy`);
  }

  // ======= FILES =======
  uploadFile(productId: number, file: File): Observable<FileDTO[]> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<FileDTO[]>(`${this.apiUrl}/${productId}/files`, formData);
  }

  // Upload preview video (MP4) for a product and receive the hosted URL
  uploadPreviewVideo(productId: number, video: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('video', video);
    return this.http.post<{ url: string }>(`${this.apiUrl}/${productId}/preview-video`, formData);
  }

  uploadImage(productId: number, image: File, type: 'cover' | 'thumbnail'): Observable<any> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post(`${this.apiUrl}/${productId}/images?type=${type}`, formData);
  }

  getFiles(productId: number): Observable<FileDTO[]> {
    return this.http.get<FileDTO[]>(`${this.apiUrl}/${productId}/files`);
  }

  deleteFile(productId: number, fileId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${productId}/files/${fileId}`);
  }

  // ======= ADMIN / MODERATION =======
  getByStatus(status: string): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/admin/by-status?status=${status}`);
  }

  approve(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/admin/${id}/approve`, {});
  }

  reject(id: number, reason: string): Observable<void> {
    const payload: ProductModerationRequestDTO = { action: 'reject', reason };
    return this.http.post<void>(`${this.apiUrl}/admin/${id}/reject`, payload);
  }

  // ======= REVIEWS =======
  getReviews(productId: number): Observable<ReviewDTO[]> {
    return this.http.get<ReviewDTO[]>(`${this.apiUrl}/${productId}/reviews`);
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

  // ======= CATEGORY FILTERING =======
  getProductsByCategory(categoryId: number, pageNumber: number = 1, pageSize: number = 10): Observable<ProductListItemDTOPagedResultDTO> {
    const key = `byCategory:${categoryId}:page=${pageNumber}:size=${pageSize}`;
    if (!this.cache.has(key)) {
      const req$ = this.http
        .get<ProductListItemDTOPagedResultDTO>(`${this.apiUrl}?categoryId=${categoryId}&pageNumber=${pageNumber}&pageSize=${pageSize}`)
        .pipe(shareReplay(1));
      this.cache.set(key, req$);
    }
    return this.cache.get(key) as Observable<ProductListItemDTOPagedResultDTO>;
  }

  // Search products by query
  searchProducts(search: string, pageNumber: number = 1, pageSize: number = 10): Observable<ProductListItemDTOPagedResultDTO> {
    return this.http.get<ProductListItemDTOPagedResultDTO>(
      `${this.apiUrl}?search=${encodeURIComponent(search)}&pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
  }

  // Get products by tag
  getProductsByTag(tagId: number, pageNumber: number = 1, pageSize: number = 10): Observable<ProductListItemDTOPagedResultDTO> {
    return this.http.get<ProductListItemDTOPagedResultDTO>(
      `${this.apiUrl}?tagId=${tagId}&pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
  }

  // Get products by multiple categories (for hierarchical filtering)
  getProductsByMultipleCategories(categoryIds: number[], pageNumber: number = 1, pageSize: number = 10): Observable<ProductListItemDTOPagedResultDTO> {
    const categoryParams = categoryIds.map(id => `categoryIds=${id}`).join('&');
    const key = `byCategories:${categoryIds.sort((a,b)=>a-b).join(',')}:page=${pageNumber}:size=${pageSize}`;
    if (!this.cache.has(key)) {
      const req$ = this.http
        .get<ProductListItemDTOPagedResultDTO>(`${this.apiUrl}/by-categories?${categoryParams}&pageNumber=${pageNumber}&pageSize=${pageSize}`)
        .pipe(shareReplay(1));
      this.cache.set(key, req$);
    }
    return this.cache.get(key) as Observable<ProductListItemDTOPagedResultDTO>;
  }

  // ======= RECEIPTS =======
  getReceipt(orderId: number): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.apiUrl}/receipt/${orderId}`);
  }

  resendReceipt(orderId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/receipt/${orderId}/resend`, {});
  }

  getProductsByCreator(creatorId: number): Observable<ProductListItemDTO[]> {
    return this.http.get<ProductListItemDTO[]>(`${this.apiUrl}/creator/${creatorId}/products`);
  }

  // Get count of PUBLIC products for a creator (excludes private/freelance products)
  getPublicProductCountForCreator(creatorId: number): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/creator/${creatorId}/public-count`).pipe(
      map(res => res.count)
    );
  }
}
