import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardSidebar } from '../../dashboard-sidebar/dashboard-sidebar';
import { PaymentService, BalanceResponse, RevenueAnalytics } from '../../../core/services/payment.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';

interface SalesData {
  totalSales: number;
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  averageOrderValue: number;
  currency: string; // Added missing currency property
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
    currency: string;
  }>;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardSidebar],
  templateUrl: './sales.html',
  styleUrl: './sales.css'
})
export class Sales implements OnInit {
  salesData: SalesData = {
    totalSales: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    averageOrderValue: 0,
    currency: 'USD', // Initialize currency
    topProducts: []
  };

  // Original data no longer needed; server handles conversion
  private originalSalesData: SalesData | null = null; // deprecated

  currentBalance: number = 0;
  loading: boolean = false;
  error: string = '';
  selectedCurrency: string = 'USD';
  availableCurrencies = ['USD', 'EGP'];

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
    this.paymentService.getBalance(this.selectedCurrency).subscribe({
      next: (response: BalanceResponse) => {
        this.currentBalance = response.currentBalance;
      },
      error: (error) => {
        console.error('Failed to load balance:', error);
        this.currentBalance = 0;
      }
    });
  }

  loadSalesData() {
    this.loading = true;
    this.error = '';

    console.log('Loading sales data with currency:', this.selectedCurrency);

    this.paymentService.getRevenueAnalytics(this.selectedCurrency).subscribe({
      next: (analytics: RevenueAnalytics) => {
        console.log('Received analytics data:', analytics);

        // Handle cases where analytics might be null or undefined
        if (analytics) {
          this.salesData = {
            totalSales: analytics.totalSales || 0,
            totalRevenue: analytics.totalRevenue || 0,
            monthlyRevenue: analytics.monthlyRevenue || 0,
            weeklyRevenue: analytics.weeklyRevenue || 0,
            averageOrderValue: analytics.averageOrderValue || 0,
            currency: this.selectedCurrency, // Set currency from selectedCurrency
            topProducts: analytics.topProducts || []
          };
          // No client-side currency conversion; use server data only
          this.originalSalesData = null;
        } else {
          console.log('No analytics data received, setting defaults');
          // Set default values if no analytics data
          this.salesData = {
            totalSales: 0,
            totalRevenue: 0,
            monthlyRevenue: 0,
            weeklyRevenue: 0,
            averageOrderValue: 0,
            currency: this.selectedCurrency, // Set currency from selectedCurrency
            topProducts: []
          };
          this.originalSalesData = null;
        }
        this.loading = false;
        this.error = ''; // Clear any previous errors
      },
      error: (error) => {
        console.error('Failed to load sales data:', error);
        // Set default values on error instead of showing error message
        this.salesData = {
          totalSales: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          weeklyRevenue: 0,
          averageOrderValue: 0,
          currency: this.selectedCurrency, // Set currency from selectedCurrency
          topProducts: []
        };
        this.originalSalesData = null;
        this.loading = false;
        this.error = ''; // Don't show error message, just display 0 values
      }
    });
  }

  onCurrencyChange() {
    // Always fetch fresh data in the selected currency
    this.loadSalesData();
    this.loadBalance();
  }

  // Removed client-side conversion; server provides numbers in requested currency

  getRevenuePercentage(): number {
    if (this.salesData.totalRevenue === 0) return 0;
    return (this.salesData.monthlyRevenue / this.salesData.totalRevenue) * 100;
  }

  formatCurrency(amount: number): string {
    const symbol = this.selectedCurrency === 'EGP' ? 'EGP' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  getCurrencySymbol(): string {
    return this.selectedCurrency === 'EGP' ? 'EGP' : '$';
  }
}
