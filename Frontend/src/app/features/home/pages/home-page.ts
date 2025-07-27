// src/app/features/home/pages/home-page/home-page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // If you have links on home page
import { AuthService } from '../../../core/services/auth';
import { ProductService } from '../../products/services/product.service'; // To fetch latest products
import { Product } from '../../../models/product.model';
import { ProductCardComponent } from '../../products/components/product-card';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';
import { Alert } from '../../../shared/ui/alert/alert';
import { PaginatedProducts } from '../../../models/product.model';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ProductCardComponent,
    LoadingSpinner,
    Alert
  ],
  templateUrl: './home-page.html',
  styleUrls: ['./home-page.css']
})
export class HomePageComponent implements OnInit {
  isLoggedIn: boolean = false;
  username: string | null = null;
  latestProducts: Product[] = [];
  isLoadingProducts = false;
  productsErrorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.username = this.authService.getCurrentUsername(); // Get username if available
      } else {
        this.username = null;
      }
    });

    this.loadLatestProducts();
  }

  loadLatestProducts(): void {
    this.isLoadingProducts = true;
    this.productsErrorMessage = null;
    // Fetch a few latest products, e.g., first 3
    this.productService.getProducts(1, 6).subscribe({
      next: (data: PaginatedProducts) => {
        this.latestProducts = data.items; // Changed from data.products to data.items
        this.isLoadingProducts = false;
      },
      error: (err) => {
        console.error('Failed to load latest products:', err);
        this.productsErrorMessage = 'Failed to load latest products.';
        this.isLoadingProducts = false;
      }
    });
  }
}
