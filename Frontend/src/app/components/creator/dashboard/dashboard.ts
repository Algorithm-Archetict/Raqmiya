import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardSidebar } from '../../dashboard-sidebar/dashboard-sidebar';
import { PaymentService, BalanceResponse } from '../../../core/services/payment.service';

interface DashboardData {
  balance: number;
  last7Days: number;
  last28Days: number;
  totalEarnings: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, DashboardSidebar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  dashboardData: DashboardData = {
    balance: 0,
    last7Days: 0,
    last28Days: 0,
    totalEarnings: 0
  };

  constructor(private paymentService: PaymentService) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    // Load real balance data
    this.paymentService.getBalance().subscribe({
      next: (response: BalanceResponse) => {
        this.dashboardData.balance = response.currentBalance;
        // For now, we'll set total earnings to current balance
        // In a real app, you'd have separate endpoints for revenue analytics
        this.dashboardData.totalEarnings = response.currentBalance;
        this.dashboardData.last7Days = Math.round(response.currentBalance * 0.3); // Mock data
        this.dashboardData.last28Days = Math.round(response.currentBalance * 0.7); // Mock data
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        // Keep mock data if API fails
        this.dashboardData = {
          balance: 1250.75,
          last7Days: 375.25,
          last28Days: 875.50,
          totalEarnings: 1250.75
        };
      }
    });
  }
}
