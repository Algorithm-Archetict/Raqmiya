import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentService, StripeConfigResponse, BalanceResponse, PaymentMethod } from '../../../core/services/payment.service';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { Subject, takeUntil } from 'rxjs';

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

  paymentForm: FormGroup;
  isLoading = false;
  stripeConfig: StripeConfigResponse | null = null;
  balance: BalanceResponse | null = null;
  paymentMethods: PaymentMethod[] = [];
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService
  ) {
    this.paymentForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]]
    });
  }

  async ngOnInit() {
    await this.initializeStripe();
    this.loadBalance();
    this.loadPaymentMethods();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeStripe() {
    try {
      this.isLoading = true;

      // Get Stripe configuration from backend
      this.paymentService.getStripeConfig()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (config) => {
            this.stripeConfig = config;
            this.setupStripeElements();
          },
          error: (error) => {
            console.error('Failed to load Stripe config:', error);
            this.errorMessage = 'Failed to load payment configuration';
          }
        });
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      this.errorMessage = 'Failed to initialize payment system';
    } finally {
      this.isLoading = false;
    }
  }

  private async setupStripeElements() {
    if (!this.stripeConfig?.publishableKey) {
      this.errorMessage = 'Stripe configuration not available';
      return;
    }

    try {
      this.stripe = await loadStripe(this.stripeConfig.publishableKey);
      if (!this.stripe) {
        throw new Error('Failed to load Stripe');
      }

      this.elements = this.stripe.elements();

      // Create card element
      this.cardElement = this.elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
            iconColor: '#c7fefb',
          },
          invalid: {
            iconColor: '#ef4444',
            color: '#ef4444',
          },
        },
      });

      // Mount the card element
      const cardContainer = document.getElementById('card-element');
      if (cardContainer && this.cardElement) {
        this.cardElement.mount(cardContainer);
      }
    } catch (error) {
      console.error('Error setting up Stripe elements:', error);
      this.errorMessage = 'Failed to setup payment form';
    }
  }

  private loadBalance() {
    this.paymentService.getBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (balance) => {
          this.balance = balance;
        },
        error: (error) => {
          console.error('Failed to load balance:', error);
          this.errorMessage = 'Failed to load account balance';
        }
      });
  }

  private loadPaymentMethods() {
    this.paymentService.getPaymentMethods()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (methods) => {
          this.paymentMethods = methods;
        },
        error: (error) => {
          console.error('Failed to load payment methods:', error);
          // Don't show error for this as it's not critical
        }
      });
  }

  async addPaymentMethod() {
    if (!this.stripe || !this.cardElement) {
      this.errorMessage = 'Payment system not ready';
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      // Create payment method
              const { error, paymentMethod } = await this.stripe.createPaymentMethod({
          type: 'card',
          card: this.cardElement!,
        });

      if (error) {
        this.errorMessage = error.message || 'Failed to create payment method';
        return;
      }

      if (paymentMethod) {
        // Send to backend
        this.paymentService.addPaymentMethod({ paymentMethodId: paymentMethod.id })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.successMessage = 'Payment method added successfully!';
                this.loadPaymentMethods();
                this.loadBalance();

                // Clear the form
                if (this.cardElement) {
                  this.cardElement.clear();
                }
              } else {
                this.errorMessage = response.message || 'Failed to add payment method';
              }
            },
            error: (error) => {
              console.error('Failed to add payment method:', error);
              this.errorMessage = 'Failed to add payment method to your account';
            }
          });
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      this.errorMessage = 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  async makeTestPayment() {
    if (!this.paymentForm.valid) {
      this.errorMessage = 'Please enter a valid amount';
      return;
    }

    const amount = this.paymentForm.get('amount')?.value;
    if (!amount || amount <= 0) {
      this.errorMessage = 'Please enter a valid amount';
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const paymentRequest = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        description: 'Test payment'
      };

      this.paymentService.makePayment(paymentRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = `Payment successful! Remaining balance: $${response.remainingBalance.toFixed(2)}`;
              this.loadBalance();
              this.paymentForm.reset();
            } else {
              this.errorMessage = response.message || 'Payment failed';
            }
          },
          error: (error) => {
            console.error('Payment failed:', error);
            if (error.error?.error) {
              this.errorMessage = error.error.error;
            } else {
              this.errorMessage = 'Payment failed. Please try again.';
            }
          }
        });
    } catch (error) {
      console.error('Error making payment:', error);
      this.errorMessage = 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  getCardBrandIcon(brand: string): string {
    const brandLower = brand.toLowerCase();
    switch (brandLower) {
      case 'visa':
        return '💳'; // You can replace with actual icon classes
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      default:
        return '💳';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
