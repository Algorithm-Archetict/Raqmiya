// src/app/features/products/pages/product-detail/product-detail.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../services/product.service';
import { Product } from '../../../models/product.model';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';
import { Alert } from '../../../shared/ui/alert/alert';
import { AuthService } from '../../../core/services/auth';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
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
  successMessage: string | null = null;
  isCreator: boolean = false;
  userRole: string | null = null;
  isDeleting: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private authService: AuthService,
    private cartService: CartService
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
        this.isCreator = this.product.creatorUsername === user.username;
      } else {
        this.isCreator = false;
      }
    });

    // Get user role
    this.userRole = this.authService.getUserRole();
  }

  loadProduct(id: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.productService.getProductById(parseInt(id)).subscribe({
      next: (data: Product) => {
        this.product = data;
        this.isLoading = false;
        
        // Re-check isCreator after product is loaded
        const currentUser = this.authService.getCurrentUsername();
        this.isCreator = this.product.creatorUsername === currentUser;
      },
      error: (err) => {
        console.error('Failed to load product details:', err);
        this.errorMessage = 'Failed to load product details. It might not exist or you may not have permission to view it.';
        this.isLoading = false;
      }
    });
  }

  onEditProduct(): void {
    if (this.product) {
      this.router.navigate(['/products/edit', this.product.id.toString()]);
    }
  }

  onDeleteProduct(): void {
    if (!this.product) return;

    const confirmed = confirm(`Are you sure you want to delete "${this.product.name}"? This action cannot be undone.`);
    if (confirmed) {
      this.isDeleting = true;
      this.errorMessage = null;
      
      this.productService.deleteProduct(this.product.id).subscribe({
        next: () => {
          this.isDeleting = false;
          alert('Product deleted successfully!');
          this.router.navigate(['/products/my-products']);
        },
        error: (err) => {
          this.isDeleting = false;
          console.error('Failed to delete product:', err);
          this.errorMessage = 'Failed to delete product. Please try again.';
        }
      });
    }
  }

  onBuyNow(): void {
    if (this.product) {
      // Add to cart and proceed to checkout
      this.addToCart();
    }
  }

  onAddToCart(): void {
    if (!this.product) return;

    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.errorMessage = 'Please log in to add items to your cart.';
      return;
    }

    // Check if product is already in cart
    if (this.cartService.isProductInCart(this.product.id)) {
      this.errorMessage = 'This product is already in your cart.';
      return;
    }

    this.cartService.addToCart(this.product, 1).subscribe({
      next: () => {
        this.successMessage = `${this.product?.name} added to cart successfully!`;
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to add product to cart.';
        console.error('Add to cart error:', error);
      }
    });
  }

  addToCart(): void {
    this.onAddToCart();
  }

  onAddToWishlist(): void {
    if (this.product) {
      console.log(`Adding ${this.product.name} to wishlist`);
      // TODO: Implement wishlist functionality
      alert(`${this.product.name} added to wishlist!`);
    }
  }

  onShareProduct(): void {
    if (this.product && navigator.share) {
      navigator.share({
        title: this.product.name,
        text: `Check out this amazing product: ${this.product.name}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Product link copied to clipboard!');
      });
    }
  }

  getProductRating(): number {
    return this.product?.averageRating || 0;
  }

  getProductStatusClass(): string {
    switch (this.product?.status) {
      case 'published':
        return 'bg-success';
      case 'draft':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  }
}
