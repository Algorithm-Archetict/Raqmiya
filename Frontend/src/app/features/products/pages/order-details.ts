// src/app/features/products/pages/order-details.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';
import { Alert } from '../../../shared/ui/alert/alert';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  creatorUsername: string;
  price: number;
  quantity: number;
  currency: string;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalItems: number;
  subtotal: number;
  total: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
  paymentMethod?: string;
  transactionId?: string;
}

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    LoadingSpinner,
    Alert
  ],
  templateUrl: './order-details.html',
  styleUrls: ['./order-details.css']
})
export class OrderDetailsComponent implements OnInit {
  order: Order | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: CartService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const orderId = params.get('id');
      if (orderId) {
        this.loadOrderDetails(orderId);
      } else {
        this.errorMessage = 'Order ID not provided.';
      }
    });
  }

  loadOrderDetails(orderId: string): void {
    this.isLoading = true;
    this.errorMessage = null;

    // In a real application, you would fetch order details from the API
    // For now, we'll simulate loading order details
    setTimeout(() => {
      this.order = this.createMockOrder(orderId);
      this.isLoading = false;
    }, 1000);
  }

  private createMockOrder(orderId: string): Order {
    return {
      id: orderId,
      userId: 'user123',
      items: [
        {
          id: 1,
          productId: 1,
          productName: 'Premium eBook Template',
          productImage: 'https://via.placeholder.com/150',
          creatorUsername: 'JohnDoe',
          price: 29.99,
          quantity: 1,
          currency: 'USD'
        },
        {
          id: 2,
          productId: 2,
          productName: 'Digital Art Collection',
          productImage: 'https://via.placeholder.com/150',
          creatorUsername: 'JaneSmith',
          price: 19.99,
          quantity: 2,
          currency: 'USD'
        }
      ],
      totalItems: 3,
      subtotal: 69.97,
      total: 69.97,
      currency: 'USD',
      status: 'completed',
      paymentStatus: 'paid',
      createdAt: new Date('2024-01-15T10:30:00Z'),
      updatedAt: new Date('2024-01-15T10:35:00Z'),
      paymentMethod: 'Credit Card',
      transactionId: 'TXN123456789'
    };
  }

  getOrderStatusClass(): string {
    switch (this.order?.status) {
      case 'pending':
        return 'bg-warning';
      case 'processing':
        return 'bg-info';
      case 'completed':
        return 'bg-success';
      case 'cancelled':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getPaymentStatusClass(): string {
    switch (this.order?.paymentStatus) {
      case 'pending':
        return 'bg-warning';
      case 'paid':
        return 'bg-success';
      case 'failed':
        return 'bg-danger';
      case 'refunded':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  getOrderStatusText(): string {
    switch (this.order?.status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getPaymentStatusText(): string {
    switch (this.order?.paymentStatus) {
      case 'pending':
        return 'Pending';
      case 'paid':
        return 'Paid';
      case 'failed':
        return 'Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return 'Unknown';
    }
  }

  downloadProduct(productId: number): void {
    // In a real application, this would trigger a download
    alert(`Downloading product ${productId}. This would initiate the file download.`);
  }

  getItemTotal(item: OrderItem): number {
    return item.price * item.quantity;
  }

  goBack(): void {
    this.router.navigate(['/products/cart']);
  }

  trackByOrderItem(index: number, item: OrderItem): number {
    return item.id;
  }
} 