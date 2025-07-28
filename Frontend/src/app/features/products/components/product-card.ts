// src/app/features/products/components/product-card/product-card.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Product } from '../../../models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.css']
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Output() quickView = new EventEmitter<Product>();
  @Output() addToCart = new EventEmitter<Product>();
  @Output() toggleWishlist = new EventEmitter<Product>();

  isHovered = false;
  isInWishlist = false; // This would be determined by a service

  onMouseEnter(): void {
    this.isHovered = true;
  }

  onMouseLeave(): void {
    this.isHovered = false;
  }

  onQuickView(): void {
    this.quickView.emit(this.product);
  }

  onAddToCart(): void {
    this.addToCart.emit(this.product);
  }

  onToggleWishlist(): void {
    this.isInWishlist = !this.isInWishlist;
    this.toggleWishlist.emit(this.product);
  }

  onViewDetails(): void {
    // Navigate to product detail page
    // This would typically use Router.navigate()
  }

  // Helper methods to handle optional properties
  getProductDescription(): string {
    return this.product.description || this.product.name;
  }

  getProductRating(): number {
    return this.product.rating || this.product.averageRating || 0;
  }

  getReviewCount(): number {
    return this.product.reviewCount || 0;
  }

  hasOriginalPrice(): boolean {
    return !!(this.product.originalPrice && this.product.originalPrice > this.product.price);
  }

  hasCategory(): boolean {
    return !!(this.product.category && this.product.category.name);
  }
}