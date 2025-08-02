import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardSidebar } from '../../dashboard-sidebar/dashboard-sidebar';

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

  constructor() {}

  ngOnInit() {
    // Initialize component
    // In a real app, this would fetch data from an API
    this.loadDashboardData();
  }

  loadDashboardData() {
    // Mock data - in a real app, this would come from an API
    this.dashboardData = {
      balance: 0,
      last7Days: 0,
      last28Days: 0,
      totalEarnings: 0
    };
  }
}
