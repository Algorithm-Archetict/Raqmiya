// src/app/features/products/pages/my-wishlist/my-wishlist.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../components/product-card';
import { Product } from '../../../models/product.model';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-my-wishlist',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LoadingSpinner,
    Alert
  ],
  templateUrl: './my-wishlist.html',
  styleUrls: ['./my-wishlist.css']
})
export class MyWishlistComponent implements OnInit {
  wishlistProducts: Product[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  isRemoving: { [key: number]: boolean } = {};

  constructor() { }

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Simulate API call with timeout
    setTimeout(() => {
      this.isLoading = false;
      
      // Populate with dummy data for now
      this.wishlistProducts = [
        {
          id: 1,
          creatorId: '1',
          productType: 'IMAGE',
          name: 'Premium Icon Set',
          permalink: 'premium-icon-set',
          price: 29.99,
          currency: 'USD',
          coverImageUrl: 'https://via.placeholder.com/150/FF5733/FFFFFF?text=IconSet',
          creatorUsername: 'IconMaster',
          averageRating: 4.5,
          salesCount: 10,
          status: 'published',
          isPublic: true,
          publishedAt: new Date(),
          description: 'A comprehensive collection of premium icons for modern applications.'
        },
        {
          id: 2,
          creatorId: '2',
          productType: 'PDF',
          name: 'Marketing E-book',
          permalink: 'marketing-ebook',
          price: 19.99,
          currency: 'USD',
          coverImageUrl: 'https://via.placeholder.com/150/3366FF/FFFFFF?text=E-book',
          creatorUsername: 'MarketingGuru',
          averageRating: 4.2,
          salesCount: 5,
          status: 'published',
          isPublic: true,
          publishedAt: new Date(),
          description: 'Complete guide to digital marketing strategies and techniques.'
        },
        {
          id: 3,
          creatorId: '3',
          productType: 'TEMPLATE',
          name: 'Web Design Template',
          permalink: 'web-design-template',
          price: 49.99,
          currency: 'USD',
          coverImageUrl: 'https://via.placeholder.com/150/33FF57/FFFFFF?text=Template',
          creatorUsername: 'DesignPro',
          averageRating: 4.8,
          salesCount: 25,
          status: 'published',
          isPublic: true,
          publishedAt: new Date(),
          description: 'Professional web design template with modern UI/UX.'
        }
      ];

      if (this.wishlistProducts.length === 0) {
        this.errorMessage = 'Your wishlist is empty!';
      }
    }, 1000);
  }

  onRemoveFromWishlist(productId: number): void {
    const confirmed = confirm('Are you sure you want to remove this item from your wishlist?');
    if (!confirmed) return;

    this.isRemoving[productId] = true;
    
    // Simulate API call
    setTimeout(() => {
      this.wishlistProducts = this.wishlistProducts.filter(p => p.id !== productId);
      this.isRemoving[productId] = false;
      
      if (this.wishlistProducts.length === 0) {
        this.errorMessage = 'Your wishlist is now empty!';
      }
    }, 500);
  }

  onClearWishlist(): void {
    const confirmed = confirm('Are you sure you want to clear your entire wishlist? This action cannot be undone.');
    if (!confirmed) return;

    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      this.wishlistProducts = [];
      this.isLoading = false;
      this.errorMessage = 'Your wishlist has been cleared!';
    }, 1000);
  }

  getTotalValue(): number {
    return this.wishlistProducts.reduce((total, product) => total + product.price, 0);
  }

  getAverageRating(): number {
    if (this.wishlistProducts.length === 0) return 0;
    const totalRating = this.wishlistProducts.reduce((sum, product) => sum + (product.averageRating || 0), 0);
    return totalRating / this.wishlistProducts.length;
  }

  trackByProduct(index: number, product: Product): number {
    return product.id;
  }

  retryLoad(): void {
    this.loadWishlist();
  }
}
