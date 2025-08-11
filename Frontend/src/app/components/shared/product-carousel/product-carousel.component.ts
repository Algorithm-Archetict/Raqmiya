import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductListItemDTO } from '../../../core/models/product/product-list-item.dto';
import { AuthService } from '../../../core/services/auth.service';
import { ProductService } from '../../../core/services/product.service';

interface CarouselProduct {
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
  inWishlist: boolean;
  loadingWishlist: boolean;
  wishlistHovered: boolean;
  isPurchased: boolean;
}

@Component({
  selector: 'app-product-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-carousel.component.html',
  styleUrl: './product-carousel.component.css'
})
export class ProductCarouselComponent implements OnChanges {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() products: ProductListItemDTO[] = [];
  @Input() loading: boolean = false;
  @Input() icon: string = 'fas fa-star';
  @Output() productClick = new EventEmitter<number>();
  @Output() viewAllClick = new EventEmitter<void>();

  carouselProducts: CarouselProduct[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private productService: ProductService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['products'] && this.products && this.products.length > 0) {
      this.carouselProducts = this.products.map(product => ({
        id: product.id,
        title: product.name || 'Untitled Product',
        creator: product.creatorUsername || 'Unknown Creator',
        price: product.price,
        rating: product.averageRating,
        ratingCount: 0,
        image: this.ensureFullUrl(product.coverImageUrl),
        category: 'Product',
        tags: ['Product'],
        badge: product.isPublic ? 'Public' : 'Private',
        inWishlist: false,
        loadingWishlist: false,
        wishlistHovered: false,
        isPurchased: false
      }));
      
      this.loadWishlistStatus();
    }
  }

  private ensureFullUrl(url: string | null | undefined): string {
    if (!url) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop';
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('/')) {
      return `http://localhost:5255${url}`;
    }
    
    return url;
  }

  onProductClick(productId: number) {
    this.productClick.emit(productId);
    this.router.navigate(['/discover', productId]);
  }

  onViewAllClick() {
    this.viewAllClick.emit();
  }

  toggleWishlist(product: CarouselProduct, event: Event) {
    event.stopPropagation();
    
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    
    if (product.loadingWishlist) return;

    product.loadingWishlist = true;

    const apiCall = product.inWishlist 
      ? this.productService.removeFromWishlist(product.id)
      : this.productService.addToWishlist(product.id);

    apiCall.subscribe({
      next: () => {
        product.inWishlist = !product.inWishlist;
        product.loadingWishlist = false;
      },
      error: (error) => {
        product.loadingWishlist = false;
        console.error('Wishlist error:', error);
      }
    });
  }

  onWishlistHover(product: CarouselProduct, isHovered: boolean, event: Event) {
    event.stopPropagation();
    product.wishlistHovered = isHovered;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  // Carousel navigation
  currentSlide = 0;
  itemsPerSlide = 4;

  get totalSlides(): number {
    return Math.ceil(this.carouselProducts.length / this.itemsPerSlide);
  }

  get canGoLeft(): boolean {
    return this.currentSlide > 0;
  }

  get canGoRight(): boolean {
    return this.currentSlide < this.totalSlides - 1;
  }

  slideLeft() {
    if (this.canGoLeft) {
      this.currentSlide--;
    }
  }

  slideRight() {
    if (this.canGoRight) {
      this.currentSlide++;
    }
  }

  getVisibleProducts(): CarouselProduct[] {
    const startIndex = this.currentSlide * this.itemsPerSlide;
    const endIndex = startIndex + this.itemsPerSlide;
    return this.carouselProducts.slice(startIndex, endIndex);
  }

  trackByProduct(index: number, product: CarouselProduct): number {
    return product.id;
  }

  private loadWishlistStatus() {
    if (!this.authService.isLoggedIn()) return;

    this.productService.getWishlist().subscribe({
      next: (wishlistProducts) => {
        const wishlistIds = wishlistProducts.map(p => p.id);
        this.carouselProducts.forEach(product => {
          product.inWishlist = wishlistIds.includes(product.id);
        });
      },
      error: (error) => {
        console.error('Error loading wishlist status:', error);
      }
    });
  }
}
