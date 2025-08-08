import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { Order } from '../../core/models/order/order.model';

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
  
  // Checkout form
  checkoutForm: FormGroup;
  
  // Payment methods
  paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: 'fas fa-credit-card' },
    { id: 'paypal', name: 'PayPal', icon: 'fab fa-paypal' }
  ];
  
  selectedPaymentMethod: string = 'card';
  
  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private formBuilder: FormBuilder
  ) {
    this.checkoutForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      cardNumber: ['', Validators.required],
      expiryDate: ['', Validators.required],
      cvv: ['', Validators.required],
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
  }
  
  loadCart() {
    this.cartService.getCart().subscribe(cart => {
      this.cartItems = cart.cart.items;
      this.calculateTotal();
    });
  }
  
  removeFromCart(productId: number) {
    this.cartService.removeFromCart(productId).subscribe(() => {
      this.loadCart();
    });
  }
  
  calculateTotal() {
    this.totalAmount = this.cartItems.reduce((total, item) => {
      return total + (item.price * 1); // Always quantity 1
    }, 0);
  }
  
  async processCheckout() {
    if (this.checkoutForm.invalid) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      // Skip validation for now - proceed directly to payment processing
      
      // Step 1: Validate payment data (mock validation)
      const paymentData = {
        method: this.selectedPaymentMethod,
        cardNumber: this.checkoutForm.value.cardNumber,
        expiry: this.checkoutForm.value.expiryDate,
        cvc: this.checkoutForm.value.cvv,
        name: `${this.checkoutForm.value.firstName} ${this.checkoutForm.value.lastName}`,
        email: this.checkoutForm.value.email
      };
      
      const paymentValidation = this.orderService.validatePaymentData(paymentData);
      if (!paymentValidation.isValid) {
        this.errorMessage = paymentValidation.errors.join(', ');
        this.isLoading = false;
        return;
      }
      
      // Step 2: Process mock payment
      const mockOrder: Order = {
        id: `temp_${Date.now()}`,
        userId: this.authService.getCurrentUser()?.id?.toString() || '',
        items: this.cartItems.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          currency: item.currency,
          quantity: item.quantity
        })),
        subtotal: this.totalAmount,
        discount: 0,
        total: this.totalAmount,
        currency: 'USD',
        status: 'pending' as any,
        paymentMethod: this.selectedPaymentMethod,
        paymentStatus: 'pending' as any,
        customerInfo: {
          email: this.checkoutForm.value.email
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      try {
        const paymentResult = await firstValueFrom(this.orderService.processMockPayment(mockOrder, paymentData));
        if (!paymentResult.success) {
          this.errorMessage = 'Payment processing failed. Please try again.';
          this.isLoading = false;
          return;
        }
        console.log('Mock payment processed successfully:', paymentResult);
      } catch (error) {
        console.error('Mock payment error:', error);
        this.errorMessage = 'Payment processing failed. Please try again.';
        this.isLoading = false;
        return;
      }
      
      // Step 3: Create real order in backend
      const orderData = {
        items: this.cartItems.map(item => ({
          productId: item.productId,
          quantity: 1 // Always 1
        })),
        paymentMethod: this.selectedPaymentMethod,
        customerInfo: {
          email: this.checkoutForm.value.email,
          firstName: this.checkoutForm.value.firstName,
          lastName: this.checkoutForm.value.lastName,
          cardNumber: this.checkoutForm.value.cardNumber,
          expiryDate: this.checkoutForm.value.expiryDate,
          cvv: this.checkoutForm.value.cvv,
          billingAddress: this.checkoutForm.value.billingAddress
        }
      };
      
      const orderResponse = await firstValueFrom(this.orderService.createOrder(orderData));
      
      if (orderResponse?.success) {
        // Clear cart
        this.cartService.clearCart().subscribe();
        
        // Redirect to purchased products page
        this.router.navigate(['/purchased-products'], { 
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