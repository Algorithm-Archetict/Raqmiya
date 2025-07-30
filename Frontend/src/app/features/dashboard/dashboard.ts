// src/app/features/dashboard/dashboard.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  isLoggedIn: boolean = false;
  username: string | null = null;
  userRole: string | null = null;

  // Dashboard Stats
  dashboardStats = [
    {
      title: 'Total Products',
      value: '12',
      icon: 'fas fa-box',
      color: 'primary',
      change: '+2 this month'
    },
    {
      title: 'Total Sales',
      value: '$2,450',
      icon: 'fas fa-dollar-sign',
      color: 'success',
      change: '+15% this month'
    },
    {
      title: 'Total Orders',
      value: '89',
      icon: 'fas fa-shopping-cart',
      color: 'warning',
      change: '+8 this week'
    },
    {
      title: 'Total Revenue',
      value: '$12,800',
      icon: 'fas fa-chart-line',
      color: 'info',
      change: '+23% this month'
    }
  ];

  // Recent Products
  recentProducts = [
    {
      id: 1,
      name: 'Complete Web Development Guide',
      price: 29.99,
      sales: 45,
      status: 'active',
      image: 'fas fa-book'
    },
    {
      id: 2,
      name: 'Premium UI Kit Bundle',
      price: 49.99,
      sales: 23,
      status: 'active',
      image: 'fas fa-palette'
    },
    {
      id: 3,
      name: 'React Component Library',
      price: 19.99,
      sales: 67,
      status: 'active',
      image: 'fas fa-code'
    }
  ];

  // Quick Actions
  quickActions = [
    {
      title: 'Create Product',
      description: 'Add a new digital product to your store',
      icon: 'fas fa-plus',
      link: '/products/create',
      color: 'primary'
    },
    {
      title: 'My Products',
      description: 'Manage your existing products',
      icon: 'fas fa-box',
      link: '/products/my-products',
      color: 'success'
    },
    {
      title: 'Analytics',
      description: 'View detailed sales analytics',
      icon: 'fas fa-chart-bar',
      link: '#',
      color: 'warning'
    },
    {
      title: 'Profile Settings',
      description: 'Update your profile information',
      icon: 'fas fa-user-cog',
      link: '#',
      color: 'info'
    }
  ];

  constructor(
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.username = this.authService.getCurrentUsername();
        this.userRole = this.authService.getUserRole();
      } else {
        this.username = null;
        this.userRole = null;
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge bg-success';
      case 'inactive':
        return 'badge bg-secondary';
      case 'draft':
        return 'badge bg-warning';
      default:
        return 'badge bg-secondary';
    }
  }
} 