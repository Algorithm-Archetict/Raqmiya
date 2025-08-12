import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { PaymentService, BalanceResponse } from '../../core/services/payment.service';
import { Cart, CartItem } from '../../core/models/cart/cart.model';
import { PaymentMethod, CustomerInfo } from '../../core/models/order/order.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout implements OnInit, OnDestroy {
  cart: Cart | null = null;
  cartItems: CartItem[] = [];
  subtotal: number = 0;
  discount: number = 0;
  total: number = 0;

  // User information
  userEmail: string = '';
  isLoggedIn: boolean = false;

  // Balance information
  currentBalance: number = 0;
  hasSufficientBalance: boolean = false;

  // Payment information
  paymentMethods: PaymentMethod[] = [
    { id: 'card', name: 'Credit/Debit Card', icon: 'fas fa-credit-card', selected: true },
    { id: 'paypal', name: 'PayPal', icon: 'fab fa-paypal', selected: false }
  ];

  // Saved payment methods from Stripe
  savedPaymentMethods: any[] = [];
  selectedPaymentMethodId: string = '';

  contactInfo: CustomerInfo = {
    email: '',
    phone: '',
    country: '',
    zipCode: ''
  };

  countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
    { code: 'IN', name: 'India' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' }
  ];

  selectedPaymentMethod: string = 'card';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private paymentService: PaymentService
  ) {}

  ngOnInit() {
    this.loadCart();
    this.checkLoginStatus();
    this.setupCartSubscription();
    this.loadBalance();
    this.loadSavedPaymentMethods();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private setupCartSubscription(): void {
    this.subscriptions.add(this.cartService.cart$.subscribe(cart => {
      this.cart = cart;
      this.cartItems = cart?.items || [];
      this.calculateTotals();
    }));
  }

  private loadCart(): void {
    this.cartService.getCart().subscribe({
      next: (response) => {
        if (response.success && response.cart) {
          this.cart = response.cart;
          this.cartItems = response.cart.items;
          this.calculateTotals();
        }
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.errorMessage = 'Failed to load cart items.';
      }
    });
  }

  private calculateTotals(): void {
    if (this.cart) {
      this.subtotal = this.cart.subtotal;
      this.discount = this.cart.discount;
      this.total = this.cart.total;
    } else {
      this.subtotal = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      this.discount = 0;
      this.total = this.subtotal - this.discount;
    }
  }

  private checkLoginStatus(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    if (this.isLoggedIn) {
      const currentUser = this.authService.getCurrentUser();
      this.userEmail = currentUser?.email || '';
      this.contactInfo.email = this.userEmail;
    }
  }

  private loadBalance(): void {
    this.paymentService.getBalance().subscribe({
      next: (response: BalanceResponse) => {
        this.currentBalance = response.currentBalance;
        this.checkBalanceForPurchase();
      },
      error: (error) => {
        console.error('Error loading balance:', error);
        this.errorMessage = 'Failed to load balance.';
      }
    });
  }

  private checkBalanceForPurchase(): void {
    if (this.total > 0) {
      this.hasSufficientBalance = this.currentBalance >= this.total;
    }
  }

  continueShopping(): void {
    this.router.navigate(['/discover']);
  }

  goToDiscover(): void {
    this.router.navigate(['/discover']);
  }

  selectPaymentMethod(methodId: string): void {
    this.selectedPaymentMethod = methodId;
    this.paymentMethods.forEach(method => {
      method.selected = method.id === methodId;
    });
  }

  async processPayment(): Promise<void> {
    if (!this.cart || this.cartItems.length === 0) {
      this.errorMessage = 'Your cart is empty.';
      return;
    }

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Create order with payment processing
      const orderData = {
        items: this.cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        paymentMethod: this.selectedPaymentMethod,
        customerInfo: this.contactInfo
      };

      const orderResponse = await firstValueFrom(this.orderService.createOrder(orderData));

      if (orderResponse?.success && orderResponse.order) {
        // Show success alert
        Swal.fire({
          title: 'Purchase Successful! 🎉',
          text: 'Product has been purchased successfully and a notification has been sent to your email',
          icon: 'success',
          confirmButtonText: 'Continue',
          confirmButtonColor: '#28a745'
        }).then(() => {
          // Clear cart after successful payment
          this.cartService.clearCart().subscribe();

          // Redirect to success page or library
          this.router.navigate(['/library']);
        });
      } else {
        this.errorMessage = orderResponse?.message || 'Failed to create order.';
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      this.errorMessage = error.message || 'An error occurred during payment processing.';
    } finally {
      this.isLoading = false;
    }
  }

  validateForm(): boolean {
    const validation = this.orderService.validatePaymentData({
      method: this.selectedPaymentMethod,
      ...this.contactInfo,
      email: this.userEmail, // Ensure email is explicitly set after spreading contactInfo
    });

    if (!validation.isValid) {
      this.errorMessage = validation.errors.join(', ');
      return false;
    }

    return true;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getButtonText(): string {
    if (this.isLoading) {
      return 'Processing...';
    }
    return `Pay $${this.total.toFixed(2)}`;
  }

  isButtonDisabled(): boolean {
    return this.isLoading || this.cartItems.length === 0 || !this.userEmail;
  }

  getItemCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  removeItem(productId: number): void {
    this.cartService.removeFromCart(productId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Item removed from cart');
          // Reload cart to update the display
          this.loadCart();
        }
      },
      error: (error) => {
        console.error('Error removing item:', error);
        this.errorMessage = 'Failed to remove item from cart.';
      }
    });
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
    } else {
      this.cartService.updateCartItem(productId, quantity).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Cart updated');
            // Reload cart to update the display
            this.loadCart();
          }
        },
        error: (error) => {
          console.error('Error updating cart:', error);
          this.errorMessage = 'Failed to update cart.';
        }
      });
    }
  }

  private loadSavedPaymentMethods(): void {
    this.paymentService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.savedPaymentMethods = methods;
        if (methods.length > 0) {
          this.selectedPaymentMethodId = methods[0].id; // Select first method by default
        }
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
      }
    });
  }
}
