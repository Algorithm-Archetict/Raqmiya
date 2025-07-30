// src/app/features/products/pages/my-products/my-products.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../components/product-card';
import { ProductService } from '../services/product.service';
import { AuthService } from '../../../core/services/auth';
import { Product, PaginatedProducts } from '../../../models/product.model';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-my-products',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LoadingSpinner,
    Alert
  ],
  templateUrl: './my-products.html',
  styleUrls: ['./my-products.css']
})
export class MyProductsComponent implements OnInit {
  myProducts: Product[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10;
  currentUserId: string | null = null;
  totalItems = 0;
  Math = Math; // Make Math available in template

  constructor(
    private productService: ProductService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication status
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      if (this.currentUserId) {
        this.loadMyProducts();
      } else {
        this.errorMessage = 'You must be logged in to view your products.';
      }
    });
  }

  loadMyProducts(): void {
    if (!this.currentUserId) return;

    this.isLoading = true;
    this.errorMessage = null;
    
    this.productService.getProductsByCreator(this.currentUserId, this.currentPage, this.itemsPerPage).subscribe({
      next: (data: PaginatedProducts) => {
        this.myProducts = data.items;
        this.totalPages = data.totalPages;
        this.totalItems = data.totalCount;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load my products:', err);
        this.errorMessage = 'Failed to load your products. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onPageChange(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadMyProducts();
    }
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (this.totalPages <= maxVisible) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    if (this.currentPage <= 3) {
      for (let i = 1; i <= 4; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(this.totalPages);
    } else if (this.currentPage >= this.totalPages - 2) {
      pages.push(1);
      pages.push('...');
      for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(this.totalPages);
    }

    return pages;
  }

  getProductStatusClass(status: string): string {
    switch (status) {
      case 'published':
        return 'bg-success';
      case 'draft':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  }

  getProductVisibilityText(isPublic: boolean): string {
    return isPublic ? 'Public' : 'Private';
  }

  getProductVisibilityClass(isPublic: boolean): string {
    return isPublic ? 'text-success' : 'text-warning';
  }

  trackByProduct(index: number, product: Product): number {
    return product.id;
  }

  getPublishedCount(): number {
    return this.myProducts.filter(p => p.status === 'published').length;
  }

  getDraftCount(): number {
    return this.myProducts.filter(p => p.status === 'draft').length;
  }

  getTotalSales(): number {
    return this.myProducts.reduce((sum, p) => sum + (p.salesCount || 0), 0);
  }
}
