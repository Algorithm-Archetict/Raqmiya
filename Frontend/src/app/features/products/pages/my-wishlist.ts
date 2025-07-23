// src/app/features/products/pages/my-wishlist/my-wishlist.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../components/product-card';
import { Product } from '../../../models/product.model';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-my-wishlist',
  standalone: true,
  imports: [
    CommonModule,
    ProductCardComponent,
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

  constructor() { }

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // --- Placeholder Logic ---
    // In a real application, you would make an API call here
    // to fetch the user's wishlist products.
    // Example: this.wishlistService.getWishlist(currentUserId).subscribe(...)

    setTimeout(() => { // Simulate API call
      this.isLoading = false;
      // Populate with dummy data for now
      this.wishlistProducts = [
        {
          id: 'wish-1',
          name: 'Premium Icon Set',
          description: 'A beautiful collection of 1000+ vector icons.',
          price: 29.99,
          currency: 'USD',
          imageUrl: 'https://via.placeholder.com/150/FF5733/FFFFFF?text=IconSet',
          creatorId: 'user-2',
          creatorUsername: 'IconMaster',
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wish-2',
          name: 'Marketing E-book',
          description: 'Learn the secrets of digital marketing in this comprehensive guide.',
          price: 19.99,
          currency: 'USD',
          imageUrl: 'https://via.placeholder.com/150/3366FF/FFFFFF?text=E-book',
          creatorId: 'user-3',
          creatorUsername: 'MarketingGuru',
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      if (this.wishlistProducts.length === 0) {
        this.errorMessage = 'Your wishlist is empty!';
      }
    }, 1000);
  }

  // You would also typically have methods to remove items from wishlist
  onRemoveFromWishlist(productId: string): void {
    console.log(`Removing ${productId} from wishlist`);
    // Implement actual removal via API call
    this.wishlistProducts = this.wishlistProducts.filter(p => p.id !== productId);
    if (this.wishlistProducts.length === 0) {
      this.errorMessage = 'Your wishlist is now empty!';
    }
  }
}
