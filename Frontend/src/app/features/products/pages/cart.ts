// src/app/features/products/pages/cart.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth';
import { Cart, CartItem } from '../../../models/cart.model';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    FormsModule,
    LoadingSpinner,
    Alert
  ],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class CartComponent implements OnInit, OnDestroy {
  cart: Cart | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isUpdating = false;
  isClearing = false;
  isCheckingOut = false;
  
  // Quantity update tracking
  updatingItems = new Set<number>();
  
  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCart();
    
    // Subscribe to cart changes
    this.cartService.cart$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(cart => {
      this.cart = cart;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCart(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.cartService.loadCart().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load cart. Please try again.';
        console.error('Cart loading error:', error);
      }
    });
  }

  updateQuantity(cartItem: CartItem, newQuantity: number): void {
    if (newQuantity === cartItem.quantity) return;
    
    this.updatingItems.add(cartItem.id);
    this.errorMessage = null;
    this.successMessage = null;

    this.cartService.updateCartItem(cartItem.id, newQuantity).subscribe({
      next: () => {
        this.updatingItems.delete(cartItem.id);
        this.successMessage = 'Cart updated successfully!';
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (error) => {
        this.updatingItems.delete(cartItem.id);
        this.errorMessage = error.message || 'Failed to update cart item.';
        console.error('Update cart error:', error);
      }
    });
  }

  removeItem(cartItem: CartItem): void {
    if (!confirm(`Are you sure you want to remove "${cartItem.product.name}" from your cart?`)) {
      return;
    }

    this.updatingItems.add(cartItem.id);
    this.errorMessage = null;
    this.successMessage = null;

    this.cartService.removeFromCart(cartItem.id).subscribe({
      next: () => {
        this.updatingItems.delete(cartItem.id);
        this.successMessage = 'Item removed from cart successfully!';
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (error) => {
        this.updatingItems.delete(cartItem.id);
        this.errorMessage = error.message || 'Failed to remove item from cart.';
        console.error('Remove cart item error:', error);
      }
    });
  }

  clearCart(): void {
    if (!this.cart || this.cart.items.length === 0) return;
    
    if (!confirm('Are you sure you want to clear your entire cart? This action cannot be undone.')) {
      return;
    }

    this.isClearing = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.cartService.clearCart().subscribe({
      next: () => {
        this.isClearing = false;
        this.successMessage = 'Cart cleared successfully!';
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (error) => {
        this.isClearing = false;
        this.errorMessage = error.message || 'Failed to clear cart.';
        console.error('Clear cart error:', error);
      }
    });
  }

  proceedToCheckout(): void {
    if (!this.cart || this.cart.items.length === 0) {
      this.errorMessage = 'Your cart is empty.';
      return;
    }

    // Validate cart before checkout
    this.cartService.validateCart().subscribe({
      next: (validation) => {
        if (!validation.isValid) {
          this.errorMessage = validation.errors.join(', ');
          return;
        }

        // Proceed to checkout
        this.isCheckingOut = true;
        // In a real app, you would navigate to checkout page
        // this.router.navigate(['/checkout']);
        
        // For now, simulate checkout process
        setTimeout(() => {
          this.isCheckingOut = false;
          alert('Checkout functionality would be implemented here. This would redirect to a payment gateway.');
        }, 2000);
      },
      error: (error) => {
        this.errorMessage = 'Failed to validate cart. Please try again.';
        console.error('Cart validation error:', error);
      }
    });
  }

  continueShopping(): void {
    this.router.navigate(['/products/list']);
  }

  getCartTotals(): { subtotal: number; total: number; currency: string } {
    return this.cartService.calculateCartTotals();
  }

  isItemUpdating(cartItemId: number): boolean {
    return this.updatingItems.has(cartItemId);
  }

  getItemTotal(cartItem: CartItem): number {
    return cartItem.price * cartItem.quantity;
  }

  isCartEmpty(): boolean {
    return !this.cart || this.cart.items.length === 0;
  }

  canCheckout(): boolean {
    return !this.isCartEmpty() && !this.isCheckingOut && !this.isClearing;
  }

  trackByCartItem(index: number, item: CartItem): number {
    return item.id;
  }
} 