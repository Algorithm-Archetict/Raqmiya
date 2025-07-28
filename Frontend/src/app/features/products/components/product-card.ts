// src/app/features/products/components/product-card/product-card.ts
import { Component, Input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common'; // CurrencyPipe for formatting
import { RouterLink } from '@angular/router'; // For linking to product detail
import { Product } from '../../../models/product.model'; // Import Product model

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe], // Import CurrencyPipe here
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.css']
})
export class ProductCardComponent {
  @Input() product!: Product; // Input property for product data

  // You can add logic here for 'Add to Cart', 'Add to Wishlist' buttons etc.
  onAddToCart(productId: string): void {
    console.log(`Product ${productId} added to cart!`);
    // Implement actual add to cart logic, e.g., using a CartService
  }

  onAddToWishlist(productId: string): void {
    console.log(`Product ${productId} added to wishlist!`);
    // Implement actual add to wishlist logic
  }
}