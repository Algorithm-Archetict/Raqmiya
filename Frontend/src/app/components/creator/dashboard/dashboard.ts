import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DashboardSidebar } from '../../dashboard-sidebar/dashboard-sidebar';
import { PaymentService, BalanceResponse, RevenueAnalytics } from '../../../core/services/payment.service';
// Services widgets moved to dedicated Services page; keep dashboard lean

interface DashboardData {
  balance: number;
  last7Days: number;
  last28Days: number;
  totalEarnings: number;
  currency: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DashboardSidebar],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  dashboardData: DashboardData = {
    balance: 0,
    last7Days: 0,
    last28Days: 0,
    totalEarnings: 0,
    currency: 'USD'
  };

  selectedCurrency: string = 'USD';
  availableCurrencies = ['USD', 'EGP'];
  loading: boolean = false;

  constructor(private paymentService: PaymentService) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;

    // Load real balance and revenue data
    this.paymentService.getBalance(this.selectedCurrency).subscribe({
      next: (response: BalanceResponse) => {
        this.dashboardData.balance = response.currentBalance;
        this.dashboardData.currency = response.currency;

        // Load revenue analytics
        this.loadRevenueAnalytics();
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.loading = false;
      }
    });
  }

  private loadRevenueAnalytics() {
    this.paymentService.getRevenueAnalytics(this.selectedCurrency).subscribe({
      next: (analytics: RevenueAnalytics) => {
        if (analytics) {
          this.dashboardData.totalEarnings = analytics.totalRevenue || 0;
          this.dashboardData.last7Days = analytics.weeklyRevenue || 0;
          this.dashboardData.last28Days = analytics.monthlyRevenue || 0;
          this.dashboardData.currency = analytics.currency || 'USD';
        } else {
          // Set default values if no analytics data
          this.dashboardData.totalEarnings = 0;
          this.dashboardData.last7Days = 0;
          this.dashboardData.last28Days = 0;
          this.dashboardData.currency = this.selectedCurrency;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading revenue analytics:', error);
        // Set default values on error
        this.dashboardData.totalEarnings = 0;
        this.dashboardData.last7Days = 0;
        this.dashboardData.last28Days = 0;
        this.dashboardData.currency = this.selectedCurrency;
        this.loading = false;
      }
    });
  }

  onCurrencyChange() {
    // Always fetch fresh numbers in selected currency
    this.loadDashboardData();
  }

  // Removed client-side conversion; server returns currency-adjusted values

  formatCurrency(amount: number): string {
    const symbol = this.selectedCurrency === 'EGP' ? 'EGP' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }
}
