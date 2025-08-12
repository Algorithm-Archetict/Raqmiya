import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardSidebar } from '../../dashboard-sidebar/dashboard-sidebar';
import { PaymentService, BalanceResponse } from '../../../core/services/payment.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';

interface SalesData {
  totalSales: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
  }>;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, DashboardSidebar],
  templateUrl: './sales.html',
  styleUrl: './sales.css'
})
export class Sales implements OnInit {
  salesData: SalesData = {
    totalSales: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageOrderValue: 0,
    topProducts: []
  };

  currentBalance: number = 0;
  loading: boolean = false;
  error: string = '';

  constructor(
    private paymentService: PaymentService,
    private orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadSalesData();
    this.loadBalance();
  }

  private loadBalance() {
    this.paymentService.getBalance().subscribe({
      next: (response: BalanceResponse) => {
        this.currentBalance = response.currentBalance;
      },
      error: (error) => {
        console.error('Failed to load balance:', error);
        // Use fallback data
        this.currentBalance = 0;
      }
    });
  }

  loadSalesData() {
    this.loading = true;
    this.error = '';

    // Get current user to filter data
    const currentUsername = this.authService.getCurrentUsername();

    // For now, we'll use mock data since we need to implement the backend sales endpoints
    // TODO: Replace with actual API calls when backend sales endpoints are implemented
    this.salesData = {
      totalSales: 12,
      totalRevenue: 1250.00,
      monthlyRevenue: 450.00,
      averageOrderValue: 104.17,
      topProducts: [
        { id: 1, name: 'Digital Art Template', sales: 5, revenue: 500.00 },
        { id: 2, name: '3D Model Pack', sales: 4, revenue: 400.00 },
        { id: 3, name: 'Video Tutorial', sales: 3, revenue: 350.00 }
      ]
    };

    this.loading = false;
  }

  getRevenuePercentage(): number {
    if (this.salesData.totalRevenue === 0) return 0;
    return (this.salesData.monthlyRevenue / this.salesData.totalRevenue) * 100;
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }
}