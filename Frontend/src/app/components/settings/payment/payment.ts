import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentService, StripeConfigResponse, BalanceResponse, PaymentMethod } from '../../../core/services/payment.service';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class Payment implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private cardElement: StripeCardElement | null = null;
  private originalBalance: number = 0; // no longer used for UI math; kept for potential debug

  paymentForm: FormGroup;
  isLoading = false;
  stripeConfig: StripeConfigResponse | null = null;
  balance: BalanceResponse | null = null;
  paymentMethods: PaymentMethod[] = [];
  errorMessage = '';
  successMessage = '';
  selectedCurrency: string = 'USD';
  availableCurrencies = ['USD', 'EGP'];
  selectedPaymentMethodId: string = '';

  constructor(
    private paymentService: PaymentService,
    private formBuilder: FormBuilder
  ) {
    this.paymentForm = this.formBuilder.group({
      amount: ['', [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit() {
    this.loadPaymentMethods();
    this.loadBalance();
    this.initializeStripe(); // Initialize Stripe immediately
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async initializeStripe() {
    try {
      this.stripeConfig = await firstValueFrom(this.paymentService.getStripeConfig());
      this.stripe = await loadStripe(this.stripeConfig.publishableKey);

      if (this.stripe) {
        this.elements = this.stripe.elements();
        this.cardElement = this.elements.create('card');
        this.cardElement.mount('#card-element');
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      this.errorMessage = 'Failed to initialize payment system.';
    }
  }

  loadBalance() {
    this.paymentService.getBalance(this.selectedCurrency).subscribe({
      next: (response: BalanceResponse) => {
        this.balance = response;
        this.selectedCurrency = response.currency;
        // If backend reports selected payment method, set selector accordingly
        if (response.selectedPaymentMethod?.paymentMethodId) {
          this.selectedPaymentMethodId = response.selectedPaymentMethod.paymentMethodId;
        }
      },
      error: (error) => {
        console.error('Failed to load balance:', error);
        this.errorMessage = 'Failed to load balance.';
      }
    });
  }

  loadPaymentMethods() {
    this.paymentService.getPaymentMethods().subscribe({
      next: (methods: PaymentMethod[]) => {
        this.paymentMethods = methods;
      },
      error: (error) => {
        console.error('Failed to load payment methods:', error);
        this.errorMessage = 'Failed to load payment methods.';
      }
    });
  }

  onCurrencyChange() {
    // Always fetch from backend to avoid client-side drift
    this.loadBalance();
  }

  async addPaymentMethod() {
    if (!this.stripe || !this.cardElement) {
      this.errorMessage = 'Payment system not initialized.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { error, paymentMethod } = await this.stripe.createPaymentMethod({
        type: 'card',
        card: this.cardElement,
      });

      if (error) {
        this.errorMessage = error.message || 'Failed to create payment method.';
        return;
      }

      if (paymentMethod) {
        this.paymentService.addPaymentMethod({
          paymentMethodId: paymentMethod.id
        }).subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = 'Payment method added successfully!';
              this.loadPaymentMethods();
              this.cardElement?.clear();
              this.paymentForm.reset();
            } else {
              this.errorMessage = response.message || 'Failed to add payment method.';
            }
          },
          error: (error) => {
            console.error('Failed to add payment method:', error);
            this.errorMessage = 'Failed to add payment method.';
          }
        });
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      this.errorMessage = 'An error occurred while adding payment method.';
    } finally {
      this.isLoading = false;
    }
  }

  async makePayment() {
    if (this.paymentForm.invalid) {
      this.errorMessage = 'Please enter a valid amount.';
      return;
    }

    const amount = this.paymentForm.value.amount;

    // Check if user has payment methods
    if (this.paymentMethods.length === 0) {
      this.errorMessage = 'Please add a payment method before making a payment.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(this.paymentService.makePayment({
        amount: amount, // currency units; backend expects decimal
        currency: this.selectedCurrency, // uppercase ('USD' | 'EGP')
        description: 'Account balance top-up'
      }));

      if (response.success) {
        this.successMessage = 'Payment processed successfully!';
        this.loadBalance();
        this.paymentForm.reset();
      } else {
        this.errorMessage = response.message || 'Payment failed.';
      }
    } catch (error) {
      console.error('Payment error:', error);
      this.errorMessage = 'An error occurred during payment.';
    } finally {
      this.isLoading = false;
    }
  }

  formatCurrency(amount: number): string {
    const symbol = this.selectedCurrency === 'EGP' ? 'EGP' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  getCurrencySymbol(): string {
    return this.selectedCurrency === 'EGP' ? 'EGP' : '$';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  onPaymentMethodChange() {
    // Persist selection on backend and refresh balance in selected currency
    if (!this.selectedPaymentMethodId) return;
    this.paymentService.selectPaymentMethodByStripe({ paymentMethodId: this.selectedPaymentMethodId })
      .subscribe({
        next: () => this.loadBalance(),
        error: (err) => {
          console.error('Failed to select payment method:', err);
          this.errorMessage = 'Failed to select payment method.';
        }
      });
  }
}
