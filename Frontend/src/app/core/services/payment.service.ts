import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

export interface AddPaymentMethodRequest {
  paymentMethodId: string;
}

export interface AddPaymentMethodResponse {
  success: boolean;
  message: string;
  customerId: string;
  paymentMethodId: string;
}

export interface PaymentRequest {
  amount: number; // Amount in cents
  currency: string;
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  remainingBalance: number;
}

export interface BalanceResponse {
  currentBalance: number;
  currency: string;
  lastUpdated: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    country: string;
  };
  isDefault: boolean;
  created: string;
}

export interface StripeConfigResponse {
  publishableKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getStripeConfig(): Observable<StripeConfigResponse> {
    return this.http.get<StripeConfigResponse>(`${this.baseUrl}/payment/config`, {
      headers: this.getHeaders()
    });
  }

  addPaymentMethod(request: AddPaymentMethodRequest): Observable<AddPaymentMethodResponse> {
    return this.http.post<AddPaymentMethodResponse>(`${this.baseUrl}/payment/add-payment-method`, request, {
      headers: this.getHeaders()
    });
  }

  makePayment(request: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.baseUrl}/payment/make-payment`, request, {
      headers: this.getHeaders()
    });
  }

  getBalance(): Observable<BalanceResponse> {
    return this.http.get<BalanceResponse>(`${this.baseUrl}/payment/balance`, { headers: this.getHeaders() });
  }

  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(`${this.baseUrl}/payment/payment-methods`, { headers: this.getHeaders() });
  }

  // Check if user has sufficient balance for a purchase
  checkBalanceForPurchase(amount: number): Observable<{ hasSufficientBalance: boolean; currentBalance: number; requiredAmount: number }> {
    return this.getBalance().pipe(
      map(balance => ({
        hasSufficientBalance: balance.currentBalance >= amount,
        currentBalance: balance.currentBalance,
        requiredAmount: amount
      }))
    );
  }
}
