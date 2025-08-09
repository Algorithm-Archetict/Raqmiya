import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { Router } from '@angular/router';

import { ProductService } from '../../core/services/product.service';
import { forkJoin } from 'rxjs';


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
  imports: [CommonModule, RouterModule, Alert, RouterLink],
  templateUrl: './purchased-products.html',
  styleUrl: './purchased-products.css'
})
export class PurchasedProducts implements OnInit {
  activeTab: 'purchased' | 'wishlist' | 'reviews' = 'purchased';
  purchasedProducts: PurchasedProductDTO[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private orderService: OrderService,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.loadPurchasedProducts();
  }


  setActiveTab(tab: 'purchased' | 'wishlist' | 'reviews') {
    this.activeTab = tab;
  }

  loadPurchasedProducts() {
    this.isLoading = true;
    this.errorMessage = null;
    this.orderService.getPurchasedProducts().subscribe({
      next: (products) => {

        // Debug: Log products to see what we're getting
        console.log('Purchased products received:', products);
        
        // Check for products without creator info
        products.forEach((product, index) => {
          console.log(`Product ${index}:`, {
            productId: product.productId,
            productName: product.productName,
            creatorUsername: product.creatorUsername,
            hasCreator: !!product.creatorUsername,
            creatorType: typeof product.creatorUsername,
            creatorValue: `"${product.creatorUsername}"`
          });
          
          if (!product.creatorUsername || product.creatorUsername.trim() === '' || product.creatorUsername === 'Unknown') {
            console.warn(`Product at index ${index} (ID: ${product.productId}) has missing, empty, or 'Unknown' creatorUsername. Full product:`, product);
          }
        });
        
        // Check if any products need creator info and fetch it
        this.enrichProductsWithCreatorInfo(products);
      },
      error: (error) => {
        this.errorMessage = 'Failed to load purchased products.';
        this.isLoading = false;
        console.error('Error loading purchased products:', error);
      }
    });
  }

  // Method to enrich products with missing creator information
  enrichProductsWithCreatorInfo(products: PurchasedProductDTO[]) {
    const productsNeedingCreatorInfo = products.filter(
      product => !product.creatorUsername || product.creatorUsername.trim() === '' || product.creatorUsername === 'Unknown'
    );

    if (productsNeedingCreatorInfo.length === 0) {
      // All products have creator info, just set them
      this.purchasedProducts = products;
      this.isLoading = false;
      return;
    }

    console.log(`Fetching creator info for ${productsNeedingCreatorInfo.length} products...`);

    // Fetch product details for products missing creator info
    const productDetailRequests = productsNeedingCreatorInfo.map(product =>
      this.productService.getById(product.productId)
    );

    forkJoin(productDetailRequests).subscribe({
      next: (productDetails) => {
        // Update products with creator information from product details
        productsNeedingCreatorInfo.forEach((product, index) => {
          const productDetail = productDetails[index];
          if (productDetail?.creatorUsername) {
            product.creatorUsername = productDetail.creatorUsername;
            console.log(`Updated product ${product.productId} with creator: ${productDetail.creatorUsername}`);
          } else {
            console.warn(`Product ${product.productId} still missing creator info even after fetching details`);
          }
        });

        this.purchasedProducts = products;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching product details for creator info:', error);
        // Fall back to original products even if we couldn't fetch creator info
        this.purchasedProducts = products;

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


  // Helper method to get creator username with fallback
  getCreatorName(product: PurchasedProductDTO): string {
    if (product.creatorUsername && 
        product.creatorUsername.trim() !== '' && 
        product.creatorUsername !== 'Unknown') {
      return product.creatorUsername;
    }
    return 'Unknown Creator';
  }
} 

