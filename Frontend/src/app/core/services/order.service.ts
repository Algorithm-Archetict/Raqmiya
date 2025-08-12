import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, retry, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Order, CreateOrderRequest, OrderResponse, CustomerInfo } from '../models/order/order.model';
import { Cart } from '../models/cart/cart.model';

interface PurchasedProductDTO {
  productId: number;
  productName: string;
  productPermalink: string;
  coverImageUrl?: string;
  creatorUsername: string;
  purchasePrice: number;
  purchaseDate: Date;
  orderId: string;
  licenseStatus: string;
  licenseExpiresAt?: Date;
  files: any[];
  productDescription: string;
  downloadGuide: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createOrder(orderData: any): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiUrl}/order`, orderData).pipe(
      retry(2), // Retry up to 2 times for order creation
      catchError(error => {
        console.error('Order creation error:', error);
        if (error.status === 401) {
          throw new Error('Authentication required. Please log in to complete your purchase.');
        }
        if (error.status === 400 && error.error?.errorType) {
          throw new Error(error.error.message || 'Order creation failed');
        }
        throw new Error('An error occurred while processing your order. Please try again.');
      })
    );
  }

  getOrder(orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/order/${orderId}`);
  }

  getUserOrders(): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/order/my`);
  }

  getPurchasedProducts(): Observable<PurchasedProductDTO[]> {
    return this.http.get<PurchasedProductDTO[]>(`${this.apiUrl}/order/my-purchases`);
  }

  getPurchasedProduct(productId: number): Observable<PurchasedProductDTO> {
    return this.http.get<PurchasedProductDTO>(`${this.apiUrl}/order/my-purchases/${productId}`);
  }

  validatePurchase(productId: number): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/order/validate-purchase/${productId}`).pipe(
      map(response => {
        // Handle both boolean and error response formats
        if (typeof response === 'boolean') {
          return response;
        }
        if (response && response.success === false) {
          throw new Error(response.message || 'Validation failed');
        }
        return response;
      }),
      retry(3), // Retry up to 3 times
      catchError(error => {
        console.error('Purchase validation error:', error);
        if (error.status === 404) {
          throw new Error('Purchase validation endpoint not found. Please contact support.');
        }
        if (error.status === 401) {
          throw new Error('Authentication required. Please log in to validate your purchase.');
        }
        if (error.status === 500) {
          throw new Error('Server error during validation. Please try again.');
        }
        throw new Error('Network error during validation. Please check your connection and try again.');
      })
    );
  }

  processPayment(orderId: string, paymentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders/${orderId}/payment`, paymentData);
  }

  validatePaymentData(paymentData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate customer information
    if (!paymentData.email || !this.isValidEmail(paymentData.email)) {
      errors.push('Please enter a valid email address');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
