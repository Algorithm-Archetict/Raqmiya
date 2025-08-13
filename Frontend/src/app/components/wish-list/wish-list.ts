import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { ProductListItemDTO } from '../../core/models/product/product-list-item.dto';


interface WishlistProduct {
  id: number;
  title: string;
  creator: string;
  price: number;
  rating: number;
  ratingCount: number;
  image: string;
  category: string;
  tags: string[];
  badge?: string;
  addedDate: Date;
}

@Component({
  selector: 'app-wish-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './wish-list.html',
  styleUrl: './wish-list.css'
})
export class WishList implements OnInit {
  wishlistProducts: WishlistProduct[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadWishlist();
  }

  loadWishlist() {
    this.isLoading = true;
    this.errorMessage = '';

    this.productService.getWishlist().subscribe({
      next: (products: ProductListItemDTO[]) => {
        this.wishlistProducts = products.map(product => ({
          id: product.id,
          title: product.name || 'Untitled Product',
          creator: product.creatorUsername && product.creatorUsername.trim() !== '' ? product.creatorUsername : 'Unknown Creator',
          price: product.price,
          rating: product.averageRating,
          ratingCount: product.salesCount,
          image: this.ensureFullUrl(product.thumbnailImageUrl || product.coverImageUrl),
          category: 'design', // Default category, you might want to add this to the DTO
          tags: ['Design'], // Default tags, you might want to add this to the DTO
          badge: product.isPublic ? 'Public' : 'Private',
          addedDate: new Date() // You might want to add this to the DTO
        }));
        
        // Debug log to see what data we're getting
        console.log('Wishlist products:', this.wishlistProducts);
        console.log('Raw products from API:', products);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading wishlist:', error);
        this.errorMessage = 'Failed to load wishlist. Please try again.';
        this.isLoading = false;
        this.wishlistProducts = []; // Set empty array on error
      }
    });
  }

  // Helper method to ensure image URLs are full URLs
  private ensureFullUrl(url: string | null | undefined): string {
    if (!url) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop';
    
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

  removeFromWishlist(productId: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    this.productService.removeFromWishlist(productId).subscribe({
      next: () => {
        // Remove from local array
        this.wishlistProducts = this.wishlistProducts.filter(p => p.id !== productId);
        this.showToast(`Product removed from wishlist`, 'success');
      },
      error: (error) => {
        console.error('Error removing from wishlist:', error);
        this.showToast(`Failed to remove product from wishlist`, 'error');
      }
    });
  }

  addToCart(productId: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    this.cartService.addToCart(productId, 1).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Product added to cart successfully');
          // Redirect to cart-checkout page
          this.router.navigate(['/cart-checkout']);
        } else {
          console.error('Failed to add to cart:', response.message);
          this.showToast(response.message || 'Failed to add product to cart', 'error');
        }
      },
      error: (error) => {
        console.error('Error adding to cart:', error);
        // Check if it's a duplicate item error (400 Bad Request)
        if (error.status === 400) {
          // Product is likely already in cart, redirect to cart page
          console.log('Product already in cart, redirecting to cart page');
          this.router.navigate(['/cart-checkout']);
        } else {
          this.showToast('Failed to add product to cart', 'error');
        }
      }
    });
  }

  viewProduct(productId: number) {
    // Navigate to product details
    this.router.navigate(['/discover', productId]);
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
