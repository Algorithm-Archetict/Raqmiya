// src/app/features/products/pages/product-list/product-list.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../components/product-card'; // Import the ProductCard
import { ProductService } from '../services/product.service'; // Import ProductService
import { Product, PaginatedProducts } from '../../../models/product.model'; // Import models
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner'; // Import spinner
import { Alert } from '../../../shared/ui/alert/alert'; // Import alert

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    ProductCardComponent, // Make ProductCard available in this template
    LoadingSpinner,
    Alert
  ],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.css']
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10; // Or whatever your API uses

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.productService.getProducts(this.currentPage, this.itemsPerPage).subscribe({
      next: (data: PaginatedProducts) => {
        this.products = data.items; // Changed from data.products to data.items
        this.totalPages = data.totalPages;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load products:', err);
        this.errorMessage = 'Failed to load products. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  get pages(): number[] {
    // Generate an array for pagination links (e.g., [1, 2, 3, ...])
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
