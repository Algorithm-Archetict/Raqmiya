// src/app/features/features/features.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './features.html',
  styleUrls: ['./features.css']
})
export class FeaturesComponent {
  features = [
    {
      icon: 'fas fa-rocket',
      title: 'Easy Product Creation',
      description: 'Create and sell digital products in minutes with our intuitive creator tools.',
      color: 'primary'
    },
    {
      icon: 'fas fa-globe',
      title: 'Global Marketplace',
      description: 'Reach customers worldwide with our international payment processing.',
      color: 'success'
    },
    {
      icon: 'fas fa-shield-alt',
      title: 'Secure Transactions',
      description: 'Bank-level security ensures your payments and data are always protected.',
      color: 'warning'
    },
    {
      icon: 'fas fa-chart-line',
      title: 'Analytics & Insights',
      description: 'Track your sales, understand your audience, and optimize your business.',
      color: 'info'
    },
    {
      icon: 'fas fa-mobile-alt',
      title: 'Mobile Optimized',
      description: 'Perfect experience on all devices - desktop, tablet, and mobile.',
      color: 'danger'
    },
    {
      icon: 'fas fa-users',
      title: 'Community Support',
      description: 'Join our creator community and get support from fellow entrepreneurs.',
      color: 'secondary'
    }
  ];

  benefits = [
    {
      title: 'For Creators',
      items: [
        'Zero setup fees',
        'Instant payouts',
        'Custom branding',
        'Marketing tools',
        'Customer analytics'
      ]
    },
    {
      title: 'For Customers',
      items: [
        'Secure payments',
        'Instant downloads',
        'Money-back guarantee',
        '24/7 support',
        'Mobile-friendly'
      ]
    }
  ];
} 