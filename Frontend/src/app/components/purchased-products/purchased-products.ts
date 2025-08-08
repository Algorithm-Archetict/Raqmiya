import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { Router } from '@angular/router';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';

interface PurchasedProductDTO {
  productId: number;
  productName: string;
  productPermalink: string;
  coverImageUrl?: string;
  creatorUsername: string;
  purchasePrice: number;
  purchaseDate: Date;
  orderId: string;
  licenseStatus: string;
  licenseExpiresAt?: Date;
  files: any[];
  productDescription: string;
  downloadGuide: string;
}

@Component({
  selector: 'app-purchased-products',
  imports: [CommonModule, RouterModule, DashboardSidebar, RouterLink],
  templateUrl: './purchased-products.html',
  styleUrl: './purchased-products.css'
})
export class PurchasedProducts implements OnInit {
  activeTab: 'purchased' | 'wishlist' | 'reviews' = 'purchased';
  purchasedProducts: PurchasedProductDTO[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  
  constructor(
    private orderService: OrderService,
    private router: Router
  ) {}
  
  ngOnInit() {
    this.loadPurchasedProducts();
  }

  setActiveTab(tab: 'purchased' | 'wishlist' | 'reviews') {
    this.activeTab = tab;
  }

  loadPurchasedProducts() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.orderService.getPurchasedProducts().subscribe({
      next: (products) => {
        this.purchasedProducts = products;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load purchased products.';
        this.isLoading = false;
      }
    });
  }
  
  viewProduct(productId: number) {
    // Navigate to product details page
    this.router.navigate(['/discover', productId]);
  }
  
  downloadProduct(productId: number) {
    // Navigate to package page for downloads
    this.router.navigate(['/package', productId]);
  }

  showInLibrary() {
    // Navigate to library component
    this.router.navigate(['/library']);
  }
  
  getLicenseStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'expired': return 'status-expired';
      case 'revoked': return 'status-revoked';
      default: return 'status-unknown';
    }
  }
  
  getLicenseStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'revoked': return 'Revoked';
      default: return 'Unknown';
    }
  }
} 