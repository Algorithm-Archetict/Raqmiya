import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { Router } from '@angular/router';
import { Alert } from '../../shared/alert/alert';

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
  standalone: true,
  imports: [CommonModule, RouterModule, Alert],
  templateUrl: './purchased-products.html',
  styleUrl: './purchased-products.css'
})
export class PurchasedProducts implements OnInit {
  purchasedProducts: PurchasedProductDTO[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPurchasedProducts();
  }

  loadPurchasedProducts() {
    this.isLoading = true;
    this.errorMessage = null;
    this.orderService.getPurchasedProducts().subscribe({
      next: (products) => {
        // Ensure products is always an array
        this.purchasedProducts = Array.isArray(products) ? products : [products];
        this.isLoading = false;
      },
      error: (_error) => {
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
