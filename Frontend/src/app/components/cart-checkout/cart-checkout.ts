import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { PaymentService, BalanceResponse } from '../../core/services/payment.service';
import { Order } from '../../core/models/order/order.model';
import Swal from 'sweetalert2';

interface CartItemDisplay {
  productId: number;
  name: string;
  price: number;
  currency: string;
  creator: string;
  image: string;
  quantity: number;
  description: string;
}

@Component({
  selector: 'app-cart-checkout',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './cart-checkout.html',
  styleUrl: './cart-checkout.css'
})
export class CartCheckout implements OnInit {
  cartItems: CartItemDisplay[] = [];
  totalAmount: number = 0;
  isLoading: boolean = false;
  errorMessage: string = '';

  // Balance information
  currentBalance: number = 0;
  hasSufficientBalance: boolean = false;

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
  }

  loadCartItems() {
    this.cartService.getCart().subscribe({
      next: (cartResponse) => {
        if (cartResponse && cartResponse.success && cartResponse.cart && cartResponse.cart.items) {
          this.cartItems = cartResponse.cart.items.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            currency: item.currency,
            creator: item.creator,
            image: item.image,
            quantity: item.quantity,
            description: item.description
          }));
          this.calculateTotal();
        }
      },
      error: (error) => {
        console.error('Error loading cart:', error);
      }
    });
  }

  loadBalance() {
    this.paymentService.getBalance().subscribe({
      next: (response: BalanceResponse) => {
        this.currentBalance = response.currentBalance;
        this.checkBalanceForPurchase();
      },
      error: (error) => {
        console.error('Error loading balance:', error);
      }
    });
  }

  checkBalanceForPurchase() {
    if (this.totalAmount > 0) {
      this.hasSufficientBalance = this.currentBalance >= this.totalAmount;
    }
  }

  removeFromCart(productId: number) {
    this.cartService.removeFromCart(productId).subscribe(() => {
      this.loadCartItems();
    });
  }

  loadCart() {
    this.loadCartItems();
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
      // Create order with payment processing
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
          billingAddress: this.checkoutForm.value.billingAddress
        }
      };

      const orderResponse = await firstValueFrom(this.orderService.createOrder(orderData));

      if (orderResponse?.success) {
        // Show success alert
        Swal.fire({
          title: 'Purchase Successful! 🎉',
          text: 'Product has been purchased successfully and a notification has been sent to your email',
          icon: 'success',
          confirmButtonText: 'Continue',
          confirmButtonColor: '#28a745'
        }).then(() => {
          // Clear cart
          this.cartService.clearCart().subscribe();

          // Redirect to purchased products page
          this.router.navigate(['/library/purchased-products'], {
            state: { orderId: orderResponse.order.id }
          });
        });
      } else {
        this.errorMessage = orderResponse?.message || 'Order creation failed.';
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      this.errorMessage = error.message || 'An error occurred during checkout.';
    } finally {
      this.isLoading = false;
    }
  }
}
