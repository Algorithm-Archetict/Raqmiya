import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { Cart, CartItem } from '../../core/models/cart/cart.model';
import { PaymentMethod, CustomerInfo } from '../../core/models/order/order.model';
import { ToastService } from '../../core/services/toast.service';

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

  // Payment information
  paymentMethods: PaymentMethod[] = [
    { id: 'card', name: 'Credit/Debit Card', icon: 'fas fa-credit-card', selected: true },
    { id: 'paypal', name: 'PayPal', icon: 'fab fa-paypal', selected: false }
  ];

  cardInfo = {
    name: '',
    number: '',
    expiry: '',
    cvc: ''
  };

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

  private cartSubscription: Subscription = new Subscription();

  constructor(
    private router: Router,
    private cartService: CartService,
    private orderService: OrderService,
  private authService: AuthService,
  private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadCart();
    this.checkLoginStatus();
    this.setupCartSubscription();
  }

  ngOnDestroy() {
    this.cartSubscription.unsubscribe();
  }

  private setupCartSubscription(): void {
    this.cartSubscription = this.cartService.cart$.subscribe(cart => {
      this.cart = cart;
      this.cartItems = cart?.items || [];
      this.calculateTotals();
    });
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

  continueShopping(): void {
    this.router.navigate(['/discover']);
  }

  goToDiscover(): void {
    this.router.navigate(['/discover']);
  }

  removeItem(productId: number): void {
    this.cartService.removeFromCart(productId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Item removed from cart');
          this.toast.success('Item removed from cart');
        }
      },
      error: (error) => {
        console.error('Error removing item:', error);
        this.errorMessage = 'Failed to remove item from cart.';
        this.toast.error(this.errorMessage);
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
            this.toast.success('Cart updated');
          }
        },
        error: (error) => {
          console.error('Error updating cart:', error);
          this.errorMessage = 'Failed to update cart.';
          this.toast.error(this.errorMessage);
        }
      });
    }
  }

  selectPaymentMethod(methodId: string): void {
    this.selectedPaymentMethod = methodId;
    this.paymentMethods.forEach(method => {
      method.selected = method.id === methodId;
    });
  }

  formatCardNumber(event: any): void {
    const formatted = this.orderService.formatCardNumber(event.target.value);
    this.cardInfo.number = formatted;
  }

  formatExpiry(event: any): void {
    const formatted = this.orderService.formatExpiry(event.target.value);
    this.cardInfo.expiry = formatted;
  }

  formatCVC(event: any): void {
    const formatted = this.orderService.formatCVC(event.target.value);
    this.cardInfo.cvc = formatted;
  }

  async processPayment(): Promise<void> {
    if (!this.cart || this.cartItems.length === 0) {
      this.errorMessage = 'Your cart is empty.';
      this.toast.error(this.errorMessage);
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
      // Prepare payment data in the format expected by backend
      const paymentData = {
        paymentMethod: this.selectedPaymentMethod,
        amount: this.total,
        transactionId: '', //  generate or get this from a real payment gateway
        currency: 'USD',
        notes: ''
      };

      // Create order
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
        // Use the real payment endpoint
        const paymentResponse = await firstValueFrom(
          this.orderService.processPayment(orderResponse.order.id.toString(), paymentData)
        );

        if (paymentResponse?.success) {
          this.successMessage = 'Payment processed successfully!';
          this.toast.success(this.successMessage);
          this.cartService.clearCart().subscribe();
          setTimeout(() => {
            this.router.navigate(['/library']);
          }, 2000);
        } else {
          this.errorMessage = paymentResponse?.message || 'Payment failed. Please try again.';
          this.toast.error(this.errorMessage);
        }
      } else {
        this.errorMessage = orderResponse?.message || 'Failed to create order.';
        this.toast.error(this.errorMessage);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      this.errorMessage = error?.error?.message || error?.message || 'An error occurred during payment processing. Please try again.';
      this.toast.error(this.errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  validateForm(): boolean {
    const validation = this.orderService.validatePaymentData({
      method: this.selectedPaymentMethod,
      ...this.contactInfo,
      email: this.userEmail, // Ensure email is explicitly set after spreading contactInfo
      ...(this.selectedPaymentMethod === 'card' ? this.cardInfo : {})
    });

    if (!validation.isValid) {
      this.errorMessage = validation.errors.join(', ');
      this.toast.error(this.errorMessage);
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
}
