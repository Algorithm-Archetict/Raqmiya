import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, CreateOrderRequest, OrderResponse, CustomerInfo } from '../models/order/order.model';
import { Cart } from '../models/cart/cart.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createOrder(cart: Cart, paymentMethod: string, customerInfo: CustomerInfo): Observable<OrderResponse> {
    const orderRequest: CreateOrderRequest = {
      items: cart.items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        currency: item.currency,
        quantity: item.quantity
      })),
      paymentMethod,
      customerInfo
    };

    return this.http.post<OrderResponse>(`${this.apiUrl}/orders`, orderRequest);
  }

  getOrder(orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/orders/${orderId}`);
  }

  getUserOrders(): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/orders/user`);
  }

  processPayment(orderId: string, paymentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders/${orderId}/payment`, paymentData);
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