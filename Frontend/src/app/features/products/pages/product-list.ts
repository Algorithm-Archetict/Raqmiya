// src/app/features/products/pages/product-list/product-list.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductCardComponent } from '../components/product-card';
import { ProductService } from '../services/product.service';
import { Product, PaginatedProducts } from '../../../models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProductCardComponent
  ],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.css']
})
export class ProductListComponent implements OnInit {
  // Products and pagination
  products: Product[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  pageSize = 12;

  // View mode
  viewMode: 'grid' | 'list' = 'grid';

  // Search and filters
  searchTerm = '';
  showFilters = false;
  selectedCategory = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  sortBy = 'newest';
  selectedStatus = '';

  // Categories (mock data for now)
  categories = [
    { id: 1, name: 'eBooks' },
    { id: 2, name: 'Graphics' },
    { id: 3, name: 'Templates' },
    { id: 4, name: 'Audio' },
    { id: 5, name: 'Video' }
  ];

  // Quick view
  selectedProduct: Product | null = null;

  // Math for template
  Math = Math;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  // View mode methods
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  // Search methods
  onSearchChange(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearchChange();
  }

  // Filter methods
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  clearCategory(): void {
    this.selectedCategory = '';
    this.onFilterChange();
  }

  clearPrice(): void {
    this.minPrice = null;
    this.maxPrice = null;
    this.onFilterChange();
  }

  clearStatus(): void {
    this.selectedStatus = '';
    this.onFilterChange();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedStatus = '';
    this.sortBy = 'newest';
    this.currentPage = 1;
    this.loadProducts();
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.selectedCategory) count++;
    if (this.minPrice || this.maxPrice) count++;
    if (this.selectedStatus) count++;
    return count;
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id.toString() === categoryId);
    return category?.name || '';
  }

  // Product methods
  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Build query parameters
    const params: any = {
      page: this.currentPage,
      pageSize: this.pageSize
    };

    if (this.searchTerm) params.search = this.searchTerm;
    if (this.selectedCategory) params.category = this.selectedCategory;
    if (this.minPrice) params.minPrice = this.minPrice;
    if (this.maxPrice) params.maxPrice = this.maxPrice;
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.sortBy) params.sortBy = this.sortBy;

    this.productService.getProducts(this.currentPage, this.pageSize).subscribe({
      next: (data: PaginatedProducts) => {
        this.products = data.items;
        this.totalPages = data.totalPages;
        this.totalItems = data.totalCount;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load products:', err);
        this.errorMessage = 'Failed to load products. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  retryLoad(): void {
    this.loadProducts();
  }

  onPageChange(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
    }
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

  // Event handlers
  onQuickView(product: Product): void {
    this.selectedProduct = product;
    // Open modal - you'll need to implement this with Bootstrap or PrimeNG
  }

  onAddToCart(product: Product): void {
    console.log('Add to cart:', product);
    // Implement cart functionality
  }

  onToggleWishlist(product: Product): void {
    console.log('Toggle wishlist:', product);
    // Implement wishlist functionality
  }

  trackByProduct(index: number, product: Product): number {
    return product.id;
  }
}
