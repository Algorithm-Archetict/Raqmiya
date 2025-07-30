// src/app/core/services/cart.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  Cart, 
  CartItem, 
  AddToCartRequest, 
  UpdateCartItemRequest, 
  CartValidationResult,
  CartValidationError,
  CartValidationWarning
} from '../../models/cart.model';
import { Product } from '../../models/product.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = environment.apiUrl;
  private cartUrl = `${this.apiUrl}/Cart`;
  
  // BehaviorSubject to track cart state
  private _cart = new BehaviorSubject<Cart | null>(null);
  cart$ = this._cart.asObservable();
  
  // BehaviorSubject to track cart item count
  private _cartItemCount = new BehaviorSubject<number>(0);
  cartItemCount$ = this._cartItemCount.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Load cart on service initialization if user is logged in
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.loadCart();
      } else {
        this.clearCart();
      }
    });
  }

  /**
   * Load user's cart from the server
   */
  loadCart(): Observable<Cart> {
    return this.http.get<Cart>(this.cartUrl).pipe(
      tap(cart => {
        this._cart.next(cart);
        this._cartItemCount.next(cart.totalItems);
      }),
      catchError(error => {
        console.error('Failed to load cart:', error);
        // Return empty cart if server error
        const emptyCart: Cart = {
          id: '',
          userId: '',
          items: [],
          totalItems: 0,
          subtotal: 0,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this._cart.next(emptyCart);
        this._cartItemCount.next(0);
        return of(emptyCart);
      })
    );
  }

  /**
   * Add product to cart with validation
   */
  addToCart(product: Product, quantity: number = 1): Observable<Cart> {
    // Validate before adding
    const validation = this.validateAddToCart(product, quantity);
    if (!validation.isValid) {
      return throwError(() => new Error(validation.errors.join(', ')));
    }

    const request: AddToCartRequest = {
      productId: product.id,
      quantity: quantity
    };

    return this.http.post<Cart>(this.cartUrl, request).pipe(
      tap(cart => {
        this._cart.next(cart);
        this._cartItemCount.next(cart.totalItems);
      }),
      catchError(error => {
        console.error('Failed to add item to cart:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update cart item quantity
   */
  updateCartItem(cartItemId: number, quantity: number): Observable<Cart> {
    if (quantity <= 0) {
      return this.removeFromCart(cartItemId);
    }

    const request: UpdateCartItemRequest = {
      cartItemId: cartItemId,
      quantity: quantity
    };

    return this.http.put<Cart>(`${this.cartUrl}/item`, request).pipe(
      tap(cart => {
        this._cart.next(cart);
        this._cartItemCount.next(cart.totalItems);
      }),
      catchError(error => {
        console.error('Failed to update cart item:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Remove item from cart
   */
  removeFromCart(cartItemId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${this.cartUrl}/item/${cartItemId}`).pipe(
      tap(cart => {
        this._cart.next(cart);
        this._cartItemCount.next(cart.totalItems);
      }),
      catchError(error => {
        console.error('Failed to remove item from cart:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Clear entire cart
   */
  clearCart(): Observable<void> {
    return this.http.delete<void>(this.cartUrl).pipe(
      tap(() => {
        this._cart.next(null);
        this._cartItemCount.next(0);
      }),
      catchError(error => {
        console.error('Failed to clear cart:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current cart
   */
  getCurrentCart(): Cart | null {
    return this._cart.value;
  }

  /**
   * Get cart item count
   */
  getCartItemCount(): number {
    return this._cartItemCount.value;
  }

  /**
   * Check if product is in cart
   */
  isProductInCart(productId: number): boolean {
    const cart = this._cart.value;
    return cart ? cart.items.some(item => item.productId === productId) : false;
  }

  /**
   * Get cart item for a specific product
   */
  getCartItemForProduct(productId: number): CartItem | null {
    const cart = this._cart.value;
    return cart ? cart.items.find(item => item.productId === productId) || null : null;
  }

  /**
   * Validate adding product to cart
   */
  private validateAddToCart(product: Product, quantity: number): CartValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if product exists
    if (!product) {
      errors.push(CartValidationError.PRODUCT_NOT_FOUND);
      return { isValid: false, errors, warnings };
    }

    // Check if product is available for purchase
    if (product.status !== 'published' || !product.isPublic) {
      errors.push(CartValidationError.PRODUCT_NOT_AVAILABLE);
    }

    // Check quantity validity
    if (quantity <= 0) {
      errors.push(CartValidationError.INVALID_QUANTITY);
    }

    // Check if product is already in cart
    if (this.isProductInCart(product.id)) {
      errors.push(CartValidationError.PRODUCT_ALREADY_IN_CART);
    }

    // Check maximum quantity (assuming max 10 per product)
    if (quantity > 10) {
      errors.push(CartValidationError.MAX_QUANTITY_EXCEEDED);
    }

    // Check total cart items limit (assuming max 50 items total)
    const currentCart = this._cart.value;
    if (currentCart && currentCart.totalItems + quantity > 50) {
      errors.push(CartValidationError.MAX_QUANTITY_EXCEEDED);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate entire cart
   */
  validateCart(): Observable<CartValidationResult> {
    const cart = this._cart.value;
    if (!cart || cart.items.length === 0) {
      return of({ isValid: true, errors: [], warnings: [] });
    }

    // In a real application, you would validate against the server
    // For now, we'll do basic validation
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if cart has items
    if (cart.items.length === 0) {
      errors.push('Cart is empty');
    }

    // Check if all items have valid quantities
    cart.items.forEach(item => {
      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for ${item.product.name}`);
      }
    });

    return of({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  /**
   * Calculate cart totals
   */
  calculateCartTotals(): { subtotal: number; total: number; currency: string } {
    const cart = this._cart.value;
    if (!cart || cart.items.length === 0) {
      return { subtotal: 0, total: 0, currency: 'USD' };
    }

    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal; // No tax/shipping for digital products

    return {
      subtotal,
      total,
      currency: cart.currency
    };
  }
} 