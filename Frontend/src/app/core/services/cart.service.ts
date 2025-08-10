import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cart, CartItem, CartUpdateRequest, CartResponse } from '../models/cart/cart.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = environment.apiUrl;
  private _cart = new BehaviorSubject<Cart | null>(null);
  cart$ = this._cart.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.loadCartFromStorage();
  }

  private loadCartFromStorage(): void {
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      try {
        const cart = JSON.parse(cartData);
        this._cart.next(cart);
      } catch (error) {
        console.error('Error parsing cart data:', error);
        this.clearCart();
      }
    }
  }

  private saveCartToStorage(cart: Cart): void {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  getCart(): Observable<CartResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.get<CartResponse>(`${this.apiUrl}/cart`).pipe(
        tap(response => {
          if (response.success) {
            this._cart.next(response.cart);
            this.saveCartToStorage(response.cart);
          }
        })
      );
    } else {
      // Return local cart for anonymous users
      const currentCart = this._cart.getValue();
      return new Observable(observer => {
        observer.next({
          success: true,
          cart: currentCart || this.createEmptyCart(),
          message: 'Local cart loaded'
        });
        observer.complete();
      });
    }
  }

  addToCart(productId: number, quantity: number = 1): Observable<CartResponse> {
    const updateRequest: CartUpdateRequest = { productId, quantity };
    
    if (this.authService.isLoggedIn()) {
      return this.http.post<CartResponse>(`${this.apiUrl}/cart/add`, updateRequest).pipe(
        tap(response => {
          if (response.success) {
            this._cart.next(response.cart);
            this.saveCartToStorage(response.cart);
          }
        })
      );
    } else {
      // Handle local cart for anonymous users
      return this.updateLocalCart(productId, quantity);
    }
  }

  updateCartItem(productId: number, quantity: number): Observable<CartResponse> {
    const updateRequest: CartUpdateRequest = { productId, quantity };
    
    if (this.authService.isLoggedIn()) {
      return this.http.put<CartResponse>(`${this.apiUrl}/cart/update`, updateRequest).pipe(
        tap(response => {
          if (response.success) {
            this._cart.next(response.cart);
            this.saveCartToStorage(response.cart);
          }
        })
      );
    } else {
      // Handle local cart for anonymous users
      return this.updateLocalCart(productId, quantity);
    }
  }

  removeFromCart(productId: number): Observable<CartResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.delete<CartResponse>(`${this.apiUrl}/cart/remove/${productId}`).pipe(
        tap(response => {
          if (response.success) {
            this._cart.next(response.cart);
            this.saveCartToStorage(response.cart);
          }
        })
      );
    } else {
      // Handle local cart for anonymous users
      return this.removeFromLocalCart(productId);
    }
  }

  clearCart(): Observable<CartResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.delete<CartResponse>(`${this.apiUrl}/cart/clear`).pipe(
        tap(response => {
          if (response.success) {
            this._cart.next(response.cart);
            this.saveCartToStorage(response.cart);
          }
        })
      );
    } else {
      // Handle local cart for anonymous users
      return this.clearLocalCart();
    }
  }

  private updateLocalCart(productId: number, quantity: number): Observable<CartResponse> {
    return new Observable(observer => {
      try {
        let currentCart = this._cart.getValue() || this.createEmptyCart();
        
        // Find existing item
        const existingItemIndex = currentCart.items.findIndex(item => item.productId === productId);
        
        if (existingItemIndex >= 0) {
          if (quantity <= 0) {
            // Remove item if quantity is 0 or negative
            currentCart.items.splice(existingItemIndex, 1);
          } else {
            // Update quantity
            currentCart.items[existingItemIndex].quantity = quantity;
          }
        } else if (quantity > 0) {
          // Add new item (mock product data - in real app, you'd fetch this from product service)
          const newItem: CartItem = {
            id: `item_${Date.now()}`,
            productId,
            name: `Product ${productId}`,
            price: 29.99, // Mock price
            currency: 'USD',
            image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
            description: 'Product description',
            creator: 'Creator Name',
            quantity,
            addedAt: new Date()
          };
          currentCart.items.push(newItem);
        }
        
        // Recalculate totals
        currentCart = this.calculateCartTotals(currentCart);
        
        this._cart.next(currentCart);
        this.saveCartToStorage(currentCart);
        
        observer.next({
          success: true,
          cart: currentCart,
          message: 'Cart updated successfully'
        });
        observer.complete();
      } catch (error) {
        observer.error({
          success: false,
          cart: null,
          message: 'Error updating cart'
        });
      }
    });
  }

  private removeFromLocalCart(productId: number): Observable<CartResponse> {
    return new Observable(observer => {
      try {
        let currentCart = this._cart.getValue() || this.createEmptyCart();
        currentCart.items = currentCart.items.filter(item => item.productId !== productId);
        currentCart = this.calculateCartTotals(currentCart);
        
        this._cart.next(currentCart);
        this.saveCartToStorage(currentCart);
        
        observer.next({
          success: true,
          cart: currentCart,
          message: 'Item removed from cart'
        });
        observer.complete();
      } catch (error) {
        observer.error({
          success: false,
          cart: null,
          message: 'Error removing item from cart'
        });
      }
    });
  }

  private clearLocalCart(): Observable<CartResponse> {
    return new Observable(observer => {
      try {
        const emptyCart = this.createEmptyCart();
        this._cart.next(emptyCart);
        this.saveCartToStorage(emptyCart);
        
        observer.next({
          success: true,
          cart: emptyCart,
          message: 'Cart cleared successfully'
        });
        observer.complete();
      } catch (error) {
        observer.error({
          success: false,
          cart: null,
          message: 'Error clearing cart'
        });
      }
    });
  }

  private createEmptyCart(): Cart {
    return {
      id: `cart_${Date.now()}`,
      userId: this.authService.getCurrentUser()?.id?.toString() || 'anonymous',
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private calculateCartTotals(cart: Cart): Cart {
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.discount = 0; // Could be calculated based on promo codes
    cart.total = cart.subtotal - cart.discount;
    cart.updatedAt = new Date();
    return cart;
  }

  getCartItemCount(): number {
    const cart = this._cart.getValue();
    return cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  }

  getCartTotal(): number {
    const cart = this._cart.getValue();
    return cart ? cart.total : 0;
  }
} 