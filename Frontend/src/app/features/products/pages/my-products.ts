// src/app/features/products/pages/my-products/my-products.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // For Add New Product button
import { ProductCardComponent } from '../components/product-card';
import { ProductService } from '../services/product.service';
import { AuthService } from '../../../core/services/auth'; // To get current user ID
import { Product, PaginatedProducts } from '../../../models/product.model';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-my-products',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ProductCardComponent,
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

  constructor(
    private productService: ProductService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // This is a placeholder. In a real app, you'd get the actual user ID
    // from your authentication service after the user logs in.
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
        this.myProducts = data.products;
        this.totalPages = data.totalPages;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load my products:', err);
        this.errorMessage = 'Failed to load your products. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadMyProducts();
    }
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
