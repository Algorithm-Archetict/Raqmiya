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

  /**
   * Maps API OrderResponse to frontend Order model, converting date strings to Date objects if needed.
   */
  private mapOrderResponse(response: OrderResponse): OrderResponse {
    if (response && response.order) {
      // Convert date strings to Date objects if you want to use them as Date in components
      // Otherwise, keep as string for display
      response.order.createdAt = response.order.createdAt;
      response.order.updatedAt = response.order.updatedAt;
      // If you want Date objects, uncomment below:
      // response.order.createdAt = new Date(response.order.createdAt);
      // response.order.updatedAt = new Date(response.order.updatedAt);
    }
    return response;
  }

  getOrder(orderId: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/order/${orderId}`)
      .pipe(map(res => this.mapOrderResponse(res)));
  }

  getUserOrders(): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/order/my`)
      .pipe(map(res => this.mapOrderResponse(res)));
  }

  getPurchasedProducts(): Observable<PurchasedProductDTO> {
    return this.http.get<PurchasedProductDTO>(`${this.apiUrl}/order/my-purchases`);
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
    // Ensure the endpoint matches the backend: /order/{orderId}/payment
    return this.http.post(`${this.apiUrl}/order/${orderId}/payment`, paymentData);
  }

  // Mock payment processing for demo purposes
  processMockPayment(order: Order, paymentData: any): Observable<any> {
    return new Observable(observer => {
      // Simulate payment processing delay
      setTimeout(() => {
        // Mock successful payment
        const mockResponse = {
          success: true,
          orderId: order.id,
          transactionId: `txn_${Date.now()}`,
          status: 'completed',
          message: 'Payment processed successfully'
        };

        observer.next(mockResponse);
        observer.complete();
      }, 2000);
    });
  }

  validatePaymentData(paymentData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate card information
    if (paymentData.method === 'card') {
      if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length < 13) {
        errors.push('Please enter a valid card number');
      }

      if (!paymentData.expiry || !/^\d{2}\/\d{2}$/.test(paymentData.expiry)) {
        errors.push('Please enter a valid expiry date (MM/YY)');
      }

      if (!paymentData.cvc || paymentData.cvc.length < 3) {
        errors.push('Please enter a valid CVC');
      }

      if (!paymentData.name) {
        errors.push('Please enter the cardholder name');
      }
    }

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

  formatCardNumber(cardNumber: string): string {
    // Remove all non-digits
    const cleaned = cardNumber.replace(/\D/g, '');

    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');

    return formatted;
  }

  formatExpiry(expiry: string): string {
    // Remove all non-digits
    const cleaned = expiry.replace(/\D/g, '');

    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }

    return cleaned;
  }

  formatCVC(cvc: string): string {
    // Remove all non-digits and limit to 3-4 characters
    return cvc.replace(/\D/g, '').slice(0, 4);
  }
}
