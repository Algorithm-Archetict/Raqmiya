// src/app/features/products/pages/product-detail/product-detail.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common'; // Import DatePipe
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../services/product.service';
import { Product } from '../../../models/product.model';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';
import { Alert } from '../../../shared/ui/alert/alert';
import { AuthService } from '../../../core/services/auth'; // To check if user is creator

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe, // Make DatePipe available
    LoadingSpinner,
    Alert
  ],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.css']
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  isCreator: boolean = false; // Flag to check if current user is the product creator

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private authService: AuthService // Inject AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const productId = params.get('id');
      if (productId) {
        this.loadProduct(productId);
      } else {
        this.errorMessage = 'Product ID not provided.';
      }
    });

    this.authService.currentUser$.subscribe(user => {
      if (this.product && user) {
        this.isCreator = this.product.creatorId === user.id;
      } else {
        this.isCreator = false;
      }
    });
  }

  loadProduct(id: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.productService.getProductById(id).subscribe({
      next: (data: Product) => {
        this.product = data;
        this.isLoading = false;
        // Re-check isCreator after product is loaded
        const currentUser = this.authService.getCurrentUsername(); // Or get actual user ID
        this.isCreator = this.product.creatorUsername === currentUser;
      },
      error: (err) => {
        console.error('Failed to load product details:', err);
        this.errorMessage = 'Failed to load product details. It might not exist.';
        this.isLoading = false;
      }
    });
  }

  onEditProduct(): void {
    if (this.product) {
      this.router.navigate(['/products/edit', this.product.id]);
    }
  }

  onDeleteProduct(): void {
    if (this.product && confirm('Are you sure you want to delete this product?')) {
      this.isLoading = true;
      this.productService.deleteProduct(this.product.id).subscribe({
        next: () => {
          this.isLoading = false;
          alert('Product deleted successfully!');
          this.router.navigate(['/products/my-products']); // Redirect to my products
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Failed to delete product:', err);
          this.errorMessage = 'Failed to delete product. Please try again.';
        }
      });
    }
  }

  onBuyNow(): void {
    if (this.product) {
      console.log(`Buying product: ${this.product.name}`);
      alert(`Simulating purchase of ${this.product.name}`);
      // Implement actual purchase logic here (e.g., redirect to checkout, open payment modal)
    }
  }
}
