// src/app/features/products/pages/product-detail.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProductService } from '../services/product.service';
import { AuthService } from '../../../core/services/auth';
import { Product } from '../../../models/product.model';
import { Alert } from '../../../shared/ui/alert/alert';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    Alert,
    LoadingSpinner
  ],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.css']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  private destroy$ = new Subject<void>();

  // User permissions
  canEdit = false;
  canDelete = false;
  isOwner = false;

  // UI state
  activeTab = 'overview';
  showFullDescription = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const productId = parseInt(idParam);
        this.loadProduct(productId);
      } else {
        this.errorMessage = 'No product ID provided.';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProduct(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.productService.getProductById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product: Product) => {
          this.product = product;
          this.checkUserPermissions();
          this.isLoading = false;
          console.log('Product loaded:', product);
        },
        error: (error) => {
          console.error('Error loading product:', error);
          this.errorMessage = error.message || 'Failed to load product.';
          this.isLoading = false;
        }
      });
  }

  private checkUserPermissions(): void {
    if (!this.product) return;

    const currentUser = this.authService.getCurrentUser();
    const userRole = this.authService.getUserRole();

    // Check if user is the owner
    this.isOwner = currentUser?.id === this.product.creatorId;

    // Set permissions based on role and ownership
    this.canEdit = this.isOwner || userRole === 'Admin';
    this.canDelete = this.isOwner || userRole === 'Admin';
  }

  onEditProduct(): void {
    if (this.product) {
      this.router.navigate(['/products/edit', this.product.id]);
    }
  }

  onDeleteProduct(): void {
    if (!this.product) return;

    if (confirm(`Are you sure you want to delete "${this.product.name}"? This action cannot be undone.`)) {
      this.isLoading = true;
      this.errorMessage = null;

      this.productService.deleteProduct(this.product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = 'Product deleted successfully.';
            setTimeout(() => {
              this.router.navigate(['/products/my-products']);
            }, 2000);
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            this.errorMessage = error.message || 'Failed to delete product.';
            this.isLoading = false;
          }
        });
    }
  }

  onToggleProductStatus(): void {
    if (!this.product) return;

    const newStatus = this.product.status === 'Published' ? 'Draft' : 'Published';
    const action = newStatus === 'Published' ? 'publish' : 'unpublish';
    
    if (confirm(`Are you sure you want to ${action} "${this.product.name}"?`)) {
      this.isLoading = true;
      this.errorMessage = null;

      const updatePayload = {
        isPublic: newStatus === 'Published'
      };

      this.productService.updateProduct(this.product.id, updatePayload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedProduct) => {
            this.product = updatedProduct;
            this.successMessage = `Product ${action}ed successfully.`;
            setTimeout(() => {
              this.successMessage = null;
            }, 3000);
            this.isLoading = false;
          },
          error: (error) => {
            console.error(`Error ${action}ing product:`, error);
            this.errorMessage = error.message || `Failed to ${action} product.`;
            this.isLoading = false;
          }
        });
    }
  }

  onAddToWishlist(): void {
    if (!this.product) return;

    this.productService.addToWishlist(this.product.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Product added to wishlist successfully.';
          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        },
        error: (error) => {
          console.error('Error adding to wishlist:', error);
          this.errorMessage = error.message || 'Failed to add product to wishlist.';
        }
      });
  }

  onRemoveFromWishlist(): void {
    if (!this.product) return;

    this.productService.removeFromWishlist(this.product.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Product removed from wishlist successfully.';
          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        },
        error: (error) => {
          console.error('Error removing from wishlist:', error);
          this.errorMessage = error.message || 'Failed to remove product from wishlist.';
        }
      });
  }

  // Helper methods for template
  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'published':
        return 'badge bg-success';
      case 'draft':
        return 'badge bg-secondary';
      case 'pending':
        return 'badge bg-warning';
      case 'rejected':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  getStatusDisplayName(status: string): string {
    switch (status?.toLowerCase()) {
      case 'published':
        return 'Published';
      case 'draft':
        return 'Draft';
      case 'pending':
        return 'Pending Review';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCategoryName(categoryId: number): string {
    const categories = [
      { id: 1, name: 'Gaming' },
      { id: 2, name: 'Software Development' },
      { id: 3, name: 'Design' },
      { id: 4, name: 'Music' },
      { id: 5, name: 'Video' },
      { id: 6, name: 'Education' },
      { id: 7, name: 'Business' },
      { id: 8, name: 'Entertainment' }
    ];
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  getTagNames(tagIds: number[]): string[] {
    const tags = [
      { id: 1, name: 'Popular' },
      { id: 2, name: 'New Release' },
      { id: 3, name: 'Featured' },
      { id: 4, name: 'Best Seller' },
      { id: 5, name: 'Trending' },
      { id: 6, name: 'Limited Time' },
      { id: 7, name: 'Premium' },
      { id: 8, name: 'Free' }
    ];
    return tagIds?.map(id => tags.find(t => t.id === id)?.name || 'Unknown') || [];
  }

  getFileSize(bytes: number): string {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileExtension(filename: string): string {
    if (!filename) return '';
    return filename.split('.').pop()?.toUpperCase() || '';
  }

  toggleDescription(): void {
    this.showFullDescription = !this.showFullDescription;
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  isActiveTab(tab: string): boolean {
    return this.activeTab === tab;
  }

  // Navigation helpers
  goBack(): void {
    window.history.back();
  }

  goToMyProducts(): void {
    this.router.navigate(['/products/my-products']);
  }

  goToProductList(): void {
    this.router.navigate(['/products/list']);
  }

  // Social sharing (placeholder for future implementation)
  shareProduct(): void {
    if (navigator.share && this.product) {
      navigator.share({
        title: this.product.name,
        text: this.product.description,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.successMessage = 'Product link copied to clipboard!';
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      });
    }
  }

  // Download product (placeholder for future implementation)
  downloadProduct(): void {
    if (!this.product) return;
    
    this.successMessage = 'Download functionality coming soon!';
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }

  // Purchase product (placeholder for future implementation)
  purchaseProduct(): void {
    if (!this.product) return;
    
    this.successMessage = 'Purchase functionality coming soon!';
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }
}
