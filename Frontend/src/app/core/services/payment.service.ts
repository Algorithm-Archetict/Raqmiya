import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  created: Date;
}

export interface SelectPaymentMethodByStripeRequest {
  paymentMethodId: string;
}

export interface BalanceResponse {
  currentBalance: number;
  currency: string;
  lastUpdated: Date;
  selectedPaymentMethod?: {
    id: number;
    paymentMethodId: string;
    balance: number;
    currency: string;
    cardBrand: string;
    cardLast4: string;
  } | null;
}

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
  amount: number;
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

export interface StripeConfigResponse {
  publishableKey: string;
}

export interface RevenueAnalytics {
  totalSales: number;
  totalRevenue: number;
  // Net revenue after platform commissions
  netRevenue?: number;
  // Commission collected for this creator
  creatorCommissionTotal?: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  averageOrderValue: number;
  currency: string;
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
    currency: string;
  }>;
  lastUpdated: Date;
}

export interface MonthlyRevenuePoint {
  year: number;
  month: number; // 1-12
  revenue: number;
  currency: string;
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

  getBalance(currency: string = 'USD'): Observable<BalanceResponse> {
    return this.http.get<BalanceResponse>(`${this.baseUrl}/payment/balance?currency=${currency}`, { headers: this.getHeaders() });
  }

  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(`${this.baseUrl}/payment/payment-methods`, { headers: this.getHeaders() });
  }

  selectPaymentMethodByStripe(req: SelectPaymentMethodByStripeRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/payment/select-payment-method-by-stripe`, req, {
      headers: this.getHeaders()
    });
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

  // Check if user has payment methods
  hasPaymentMethods(): Observable<boolean> {
    return this.getPaymentMethods().pipe(
      map(methods => methods.length > 0)
    );
  }

  // Get revenue analytics for creator
  getRevenueAnalytics(currency: string = 'USD'): Observable<RevenueAnalytics> {
    return this.http.get<RevenueAnalytics>(`${this.baseUrl}/revenue-analytics/my-analytics?currency=${currency}`, {
      headers: this.getHeaders()
    });
  }

  // Get last 12 months revenue series for current creator
  getMyMonthlySeries(currency: string = 'USD'): Observable<MonthlyRevenuePoint[]> {
    return this.http
      .get<{ series: MonthlyRevenuePoint[]; currency: string }>(`${this.baseUrl}/revenue-analytics/my-monthly-series?currency=${currency}`, {
        headers: this.getHeaders(),
      })
      .pipe(map(res => res.series || []));
  }

  // Email my analytics report
  emailMyAnalyticsReport(currency: string = 'USD'): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/revenue-analytics/email-my-report?currency=${encodeURIComponent(currency)}`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // Convert currency with proper EGP/USD conversion
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Observable<{
    originalAmount: number;
    fromCurrency: string;
    toCurrency: string;
    convertedAmount: number;
  }> {
    let convertedAmount = amount;

    // Simple conversion logic for USD <-> EGP
    if (fromCurrency === 'USD' && toCurrency === 'EGP') {
      convertedAmount = amount * 50; // 1 USD = 50 EGP
    } else if (fromCurrency === 'EGP' && toCurrency === 'USD') {
      convertedAmount = amount * 0.02; // 1 EGP = 0.02 USD
    }

    return new Observable(observer => {
      observer.next({
        originalAmount: amount,
        fromCurrency,
        toCurrency,
        convertedAmount
      });
      observer.complete();
    });
  }

  // Validate payment method before purchase
  validatePaymentMethodForPurchase(): Observable<{ hasPaymentMethod: boolean; message: string }> {
    return this.hasPaymentMethods().pipe(
      map(hasPaymentMethod => ({
        hasPaymentMethod,
        message: hasPaymentMethod ? 'Payment method available' : 'No payment method added. Please add a payment method before making a purchase.'
      }))
    );
  }
}
