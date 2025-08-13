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
import Swal from 'sweetalert2';

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
    this.autoFillUserEmail();
  }
  
  autoFillUserEmail() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.email) {
      this.checkoutForm.patchValue({
        email: currentUser.email
      });
    }
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
      Swal.fire({
        icon: 'warning',
        title: 'Form Validation Error',
        text: 'Please fill in all required fields.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    if (!this.hasSufficientBalance) {
      Swal.fire({
        icon: 'error',
        title: 'Insufficient Balance',
        text: `You have $${this.currentBalance.toFixed(2)} but need $${this.totalAmount.toFixed(2)}.`,
        confirmButtonColor: '#d33',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    // Show confirmation alert with SweetAlert2
    const result = await Swal.fire({
      title: 'Confirm Purchase',
      text: `Are you sure you want to purchase these items for $${this.totalAmount.toFixed(2)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, purchase!',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) {
      return;
    }
    
    this.isLoading = true;
    
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
      let errorMsg = 'An unexpected error occurred during checkout. Please try again.';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      Swal.fire({
        icon: 'error',
        title: 'Checkout Error',
        text: errorMsg,
        confirmButtonColor: '#d33',
        confirmButtonText: 'OK'
      });
    } finally {
      this.isLoading = false;
    }
  }
} 