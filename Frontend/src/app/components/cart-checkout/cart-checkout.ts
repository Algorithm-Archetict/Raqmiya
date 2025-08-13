import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { ProductService } from '../../core/services/product.service';
import { PaymentService } from '../../core/services/payment.service';
import { Order } from '../../core/models/order/order.model';
import { BalanceResponse } from '../../core/services/payment.service';

interface CartItem {
  productId: number;
  name: string;
  price: number;
  currency: string;
  creator: string;
  image: string;
  quantity: number;
}

@Component({
  selector: 'app-cart-checkout',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './cart-checkout.html',
  styleUrl: './cart-checkout.css'
})
export class CartCheckout implements OnInit {
  cartItems: CartItem[] = [];
  totalAmount: number = 0;
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Balance information
  currentBalance: number = 0;
  hasSufficientBalance: boolean = false;
  balanceLoading: boolean = false;
  
  // Checkout form
  checkoutForm: FormGroup;
  
  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private productService: ProductService,
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
    // Check if user is authenticated
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }
    
    this.loadCart();
    this.loadBalance();
  }
  
  loadCart() {
    this.cartService.getCart().subscribe(cart => {
      this.cartItems = cart.cart.items;
      this.calculateTotal();
      this.checkBalanceSufficiency();
    });
  }
  
  loadBalance() {
    this.balanceLoading = true;
    this.paymentService.getBalance().subscribe({
      next: (balance: BalanceResponse) => {
        this.currentBalance = balance.currentBalance;
        this.checkBalanceSufficiency();
        this.balanceLoading = false;
      },
      error: (error) => {
        console.error('Error loading balance:', error);
        this.balanceLoading = false;
        // Set default balance if API fails
        this.currentBalance = 0;
        this.hasSufficientBalance = false;
      }
    });
  }
  
  checkBalanceSufficiency() {
    this.hasSufficientBalance = this.currentBalance >= this.totalAmount;
  }
  
  removeFromCart(productId: number) {
    this.cartService.removeFromCart(productId).subscribe(() => {
      this.loadCart();
    });
  }
  
  calculateTotal() {
    this.totalAmount = this.cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    this.checkBalanceSufficiency();
  }

  private async removePurchasedProductsFromWishlist() {
    // Remove each purchased product from the user's wishlist
    for (const item of this.cartItems) {
      try {
        await firstValueFrom(this.productService.removeFromWishlist(item.productId));
        console.log(`Product ${item.productId} removed from wishlist after purchase`);
      } catch (error) {
        // Log error but don't fail the purchase process
        console.warn(`Failed to remove product ${item.productId} from wishlist:`, error);
      }
    }
  }
  
  async processCheckout() {
    if (this.checkoutForm.invalid) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }
    
    if (!this.hasSufficientBalance) {
      this.errorMessage = `Insufficient balance. You have $${this.currentBalance.toFixed(2)} but need $${this.totalAmount.toFixed(2)}.`;
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
        
        // Redirect to purchased products page
        this.router.navigate(['/library/purchased-products'], { 
          state: { orderId: orderResponse.order.id } 
        });
      } else {
        this.errorMessage = orderResponse?.message || 'Order creation failed.';
      }
    } catch (error) {
      console.error('Checkout error:', error);
      if (error instanceof Error) {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = 'An unexpected error occurred during checkout. Please try again.';
      }
    } finally {
      this.isLoading = false;
    }
  }
} 