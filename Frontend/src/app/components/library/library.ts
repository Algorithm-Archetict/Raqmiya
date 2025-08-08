import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';

interface LibraryProduct {
  id: string;
  title: string;
  image: string;
  creator: string;
  creatorLink: string;
  showMenu: boolean;
  type: 'purchased' | 'wishlist' | 'reviews';
  purchaseDate?: Date;
  purchasePrice?: number;
  licenseStatus?: string;
  productId?: number;
}

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
  selector: 'app-library',
  imports: [CommonModule, RouterModule, DashboardSidebar],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class Library implements OnInit {
  activeTab: 'purchased' | 'wishlist' | 'reviews' = 'purchased';
  showDeleteModal: boolean = false;
  productToDelete: LibraryProduct | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';

  // Real data arrays
  purchasedProducts: LibraryProduct[] = [];
  wishlistProducts: LibraryProduct[] = [];
  reviewProducts: LibraryProduct[] = [];

  constructor(
    private orderService: OrderService,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.loadPurchasedProducts();
    this.loadWishlistProducts();
    this.loadReviewProducts();
  }

  loadPurchasedProducts() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.orderService.getPurchasedProducts().subscribe({
      next: (products: PurchasedProductDTO[]) => {
        this.purchasedProducts = products.map(product => ({
          id: product.productId.toString(),
          title: product.productName,
          image: product.coverImageUrl || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
          creator: product.creatorUsername,
          creatorLink: '#',
          showMenu: false,
          type: 'purchased' as const,
          purchaseDate: product.purchaseDate,
          purchasePrice: product.purchasePrice,
          licenseStatus: product.licenseStatus,
          productId: product.productId
        }));
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load purchased products.';
        this.isLoading = false;
        console.error('Error loading purchased products:', error);
      }
    });
  }

  loadWishlistProducts() {
    this.productService.getWishlist().subscribe({
      next: (products: any[]) => {
        this.wishlistProducts = products.map(product => ({
          id: product.id.toString(),
          title: product.name || 'Untitled Product',
          image: this.ensureFullUrl(product.coverImageUrl),
          creator: product.creatorUsername || 'Unknown Creator',
          creatorLink: '#',
          showMenu: false,
          type: 'wishlist' as const,
          productId: product.id
        }));
      },
      error: (error) => {
        console.error('Error loading wishlist products:', error);
        // Continue with empty wishlist if API fails
        this.wishlistProducts = [];
      }
    });
  }

  loadReviewProducts() {
    // TODO: Replace with real reviews service call when available
    this.reviewProducts = [
      {
        id: '6',
        title: 'Video Editing Masterclass',
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
        creator: 'Video Academy',
        creatorLink: '#',
        showMenu: false,
        type: 'reviews'
      }
    ];
  }

  // Helper method to ensure image URLs are full URLs
  private ensureFullUrl(url: string | null | undefined): string {
    if (!url) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop';
    
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative URL, convert to full backend URL
    if (url.startsWith('/')) {
      return `http://localhost:5255${url}`;
    }
    
    return url;
  }

  setActiveTab(tab: 'purchased' | 'wishlist' | 'reviews') {
    this.activeTab = tab;
    // Close any open menus when switching tabs
    this.closeAllMenus();
  }

  getCurrentProducts(): LibraryProduct[] {
    switch (this.activeTab) {
      case 'purchased':
        return this.purchasedProducts;
      case 'wishlist':
        return this.wishlistProducts;
      case 'reviews':
        return this.reviewProducts;
      default:
        return this.purchasedProducts;
    }
  }

  openActionMenu(productId: string) {
    // Close all other menus first
    this.closeAllMenus();
    
    // Find and open the clicked product's menu
    const allProducts = [...this.purchasedProducts, ...this.wishlistProducts, ...this.reviewProducts];
    const product = allProducts.find(p => p.id === productId);
    if (product) {
      product.showMenu = true;
    }
  }

  closeAllMenus() {
    const allProducts = [...this.purchasedProducts, ...this.wishlistProducts, ...this.reviewProducts];
    allProducts.forEach(product => {
      product.showMenu = false;
    });
  }

  deleteProduct(product: LibraryProduct) {
    this.productToDelete = product;
    this.showDeleteModal = true;
    this.closeAllMenus();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  confirmDelete() {
    if (this.productToDelete) {
      // Handle deletion based on product type
      if (this.productToDelete.type === 'wishlist' && this.productToDelete.productId) {
        // Remove from wishlist via API
        this.productService.removeFromWishlist(this.productToDelete.productId).subscribe({
          next: () => {
            this.wishlistProducts = this.wishlistProducts.filter(p => p.id !== this.productToDelete!.id);
            this.showToast(`Product removed from wishlist`, 'success');
          },
          error: (error) => {
            console.error('Error removing from wishlist:', error);
            this.showToast(`Failed to remove product from wishlist`, 'error');
          }
        });
      } else {
        // Remove from local array for other types
        switch (this.productToDelete.type) {
          case 'purchased':
            this.purchasedProducts = this.purchasedProducts.filter(p => p.id !== this.productToDelete!.id);
            break;
          case 'reviews':
            this.reviewProducts = this.reviewProducts.filter(p => p.id !== this.productToDelete!.id);
            break;
        }
      }
      
      this.closeDeleteModal();
    }
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

  // Show toast notification
  showToast(message: string, type: 'success' | 'error' = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }
}
