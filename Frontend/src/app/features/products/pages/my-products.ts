// src/app/features/products/pages/my-products.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, switchMap, of } from 'rxjs';
import { ProductService } from '../services/product.service';
import { AuthService } from '../../../core/services/auth';
import { Product, PaginatedProducts } from '../../../models/product.model';
import { Alert } from '../../../shared/ui/alert/alert';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';

@Component({
  selector: 'app-my-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Alert,
    LoadingSpinner
  ],
  templateUrl: './my-products.html',
  styleUrls: ['./my-products.css']
})
export class MyProductsComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;
  private destroy$ = new Subject<void>();

  // Search and filter properties
  searchQuery = '';
  selectedCategory: string = '';
  selectedStatus: string = '';

  // Categories for filtering
  categories = [
    { id: 1, name: 'Gaming' },
    { id: 2, name: 'Software Development' },
    { id: 3, name: 'Design' },
    { id: 4, name: 'Music' },
    { id: 5, name: 'Video' },
    { id: 6, name: 'Education' },
    { id: 7, name: 'Business' },
    { id: 8, name: 'Entertainment' }
  ];

  // Status options for filtering
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Published', label: 'Published' },
    { value: 'Pending', label: 'Pending Review' },
    { value: 'Rejected', label: 'Rejected' }
  ];

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMyProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyProducts(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.errorMessage = 'User not authenticated. Please log in again.';
      this.isLoading = false;
      this.router.navigate(['/auth/login']);
      return;
    }

    this.productService.getProductsByCreator(currentUser.id, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedProducts) => {
          this.products = response.items;
          this.currentPage = response.pageNumber;
          this.totalPages = response.totalPages;
          this.totalCount = response.totalCount;
          this.isLoading = false;
          console.log('My products loaded:', response);
        },
        error: (error) => {
          console.error('Error loading my products:', error);
          this.errorMessage = error.message || 'Failed to load your products.';
          this.isLoading = false;
        }
      });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadMyProducts();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadMyProducts();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadMyProducts();
  }

  onEditProduct(product: Product): void {
    this.router.navigate(['/products/edit', product.id]);
  }

  onViewProduct(product: Product): void {
    this.router.navigate(['/products/detail', product.id]);
  }

  onDeleteProduct(product: Product): void {
    if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      this.isLoading = true;
      this.errorMessage = null;

      this.productService.deleteProduct(product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = `Product "${product.name}" deleted successfully.`;
            this.loadMyProducts(); // Reload the list
            setTimeout(() => {
              this.successMessage = null;
            }, 3000);
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            this.errorMessage = error.message || 'Failed to delete product.';
            this.isLoading = false;
          }
        });
    }
  }

  onToggleProductStatus(product: Product): void {
    const newStatus = product.status === 'Published' ? 'Draft' : 'Published';
    const action = newStatus === 'Published' ? 'publish' : 'unpublish';
    
    if (confirm(`Are you sure you want to ${action} "${product.name}"?`)) {
      this.isLoading = true;
      this.errorMessage = null;

      const updatePayload = {
        isPublic: newStatus === 'Published'
      };

      this.productService.updateProduct(product.id, updatePayload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedProduct) => {
            this.successMessage = `Product "${product.name}" ${action}ed successfully.`;
            this.loadMyProducts(); // Reload the list
            setTimeout(() => {
              this.successMessage = null;
            }, 3000);
          },
          error: (error) => {
            console.error(`Error ${action}ing product:`, error);
            this.errorMessage = error.message || `Failed to ${action} product.`;
            this.isLoading = false;
          }
        });
    }
  }

  onCreateNewProduct(): void {
    this.router.navigate(['/products/create']);
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

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  getTotalItemsText(): string {
    if (this.totalCount === 0) return 'No products found';
    if (this.totalCount === 1) return '1 product';
    return `${this.totalCount} products`;
  }

  getCurrentPageText(): string {
    if (this.totalPages === 0) return '';
    return `Page ${this.currentPage} of ${this.totalPages}`;
  }

  // Filter products based on search and filters
  getFilteredProducts(): Product[] {
    let filtered = this.products;

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.productType.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(product =>
        product.categoryIds?.includes(parseInt(this.selectedCategory)) ||
        product.category?.id === parseInt(this.selectedCategory)
      );
    }

    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(product =>
        product.status === this.selectedStatus
      );
    }

    return filtered;
  }

  // Clear all filters
  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadMyProducts();
  }

  // Export products (placeholder for future implementation)
  exportProducts(): void {
    console.log('Export functionality to be implemented');
    this.successMessage = 'Export functionality coming soon!';
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }

  // Bulk actions (placeholder for future implementation)
  onBulkAction(action: string): void {
    console.log(`Bulk ${action} functionality to be implemented`);
    this.successMessage = `Bulk ${action} functionality coming soon!`;
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }
}
