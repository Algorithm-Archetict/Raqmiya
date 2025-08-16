import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { PaymentService, BalanceResponse } from '../../core/services/payment.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';
import { CartResponse, CartItem } from '../../core/models/cart/cart.model';
import { firstValueFrom } from 'rxjs';

interface CartItemDisplay {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  currency: string;
  creator: string;
  image: string;
}

@Component({
  selector: 'app-cart-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cart-checkout.html',
  styleUrl: './cart-checkout.css'
})
export class CartCheckout implements OnInit {
  cartItems: CartItemDisplay[] = [];
  checkoutForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  currentBalance: number = 0;
  balanceLoading = false;
  hasSufficientBalance = false;
  total: number = 0;

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private paymentService: PaymentService,
    private router: Router,
    private formBuilder: FormBuilder
  ) {
    this.checkoutForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      billingAddress: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadCartItems();
    this.loadBalance();
    this.validatePaymentMethod();
    this.loadUserEmail(); // Load user email
  }

  private loadUserEmail() {
    // Get user email from auth service or localStorage
    const userEmail = this.authService.getCurrentUserEmail();
    if (userEmail) {
      this.checkoutForm.patchValue({
        email: userEmail
      });
    }
  }

  private loadCartItems() {
    this.cartService.getCart().subscribe({
      next: (response: CartResponse) => {
        if (response.success && response.cart) {
          this.cartItems = response.cart.items.map((item: CartItem) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            currency: item.currency,
            creator: item.creator,
            image: item.image
          }));
          this.calculateTotal();
        }
      },
      error: (error: any) => {
        console.error('Failed to load cart items:', error);
        this.errorMessage = 'Failed to load cart items. Please try again.';
      }
    });
  }

  private loadBalance() {
    this.balanceLoading = true;
    this.paymentService.getBalance().subscribe({
      next: (response: BalanceResponse) => {
        this.currentBalance = response.currentBalance;
        this.checkBalanceForPurchase();
        this.balanceLoading = false;
      },
      error: (error) => {
        console.error('Error loading balance:', error);
        this.currentBalance = 0;
        this.balanceLoading = false;
      }
    });
  }

  private validatePaymentMethod() {
    this.paymentService.validatePaymentMethodForPurchase().subscribe({
      next: (validation) => {
        if (!validation.hasPaymentMethod) {
          this.showPaymentMethodError(validation.message);
        }
      },
      error: (error) => {
        console.error('Error validating payment method:', error);
      }
    });
  }

  private showPaymentMethodError(message: string) {
    Swal.fire({
      icon: 'warning',
      title: 'Payment Method Required',
      text: message,
      confirmButtonText: 'Add Payment Method',
      showCancelButton: true,
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/settings/payment']);
      }
    });
  }

  private calculateTotal() {
    this.total = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.checkBalanceForPurchase();
  }

  private checkBalanceForPurchase() {
    if (this.total > 0) {
      this.hasSufficientBalance = this.currentBalance >= this.total;
    }
  }

  async processCheckout() {
    if (this.checkoutForm.invalid) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    // Prevent duplicate submissions
    if (this.isLoading) {
      console.log('Checkout already in progress, ignoring duplicate request');
      return;
    }

    // Validate payment method before proceeding
    const hasPaymentMethod = await firstValueFrom(this.paymentService.hasPaymentMethods());
    if (!hasPaymentMethod) {
      this.showPaymentMethodError('No payment method added. Please add a payment method before making a purchase.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Create order data
      const orderData = {
        items: this.cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        paymentMethod: 'direct',
        customerInfo: {
          email: this.checkoutForm.value.email,
          firstName: this.checkoutForm.value.firstName,
          lastName: this.checkoutForm.value.lastName,
          billingAddress: this.checkoutForm.value.billingAddress
        }
      };

      const orderResponse = await firstValueFrom(this.orderService.createOrder(orderData));

      if (orderResponse?.success) {
        // Clear cart
        this.cartService.clearCart().subscribe();

        // Remove purchased products from wishlist
        await this.removePurchasedProductsFromWishlist();

        // Refresh balance to reflect the purchase
        this.loadBalance();

        // Show success alert with SweetAlert2
        await Swal.fire({
          icon: 'success',
          title: 'Purchase Successful!',
          text: 'Your purchase has been completed successfully for products: ' + this.cartItems.map(item => item.name).join(', ') + '. Redirecting to your library...',
          timer: 5000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        // Redirect to purchased products page
        this.router.navigate(['/library/purchased-products'], {
          state: { orderId: orderResponse.order.id }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Purchase Failed',
          text: orderResponse?.message || 'Order creation failed.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'OK'
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      this.errorMessage = 'An error occurred during checkout. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private async removePurchasedProductsFromWishlist() {
    // Implementation for removing purchased products from wishlist
    // This would depend on your wishlist service implementation
  }

  updateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(productId);
    } else {
      this.cartService.updateCartItem(productId, quantity).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadCartItems();
          }
        },
        error: (error) => {
          console.error('Error updating cart:', error);
          this.errorMessage = 'Failed to update cart.';
        }
      });
    }
  }

  removeItem(productId: number) {
    this.cartService.removeFromCart(productId).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadCartItems();
        }
      },
      error: (error) => {
        console.error('Error removing item:', error);
        this.errorMessage = 'Failed to remove item from cart.';
      }
    });
  }

  continueShopping() {
    this.router.navigate(['/discover']);
  }

  goToDiscover() {
    this.router.navigate(['/discover']);
  }
}
