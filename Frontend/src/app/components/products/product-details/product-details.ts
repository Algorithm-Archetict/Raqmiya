import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { ProductDetailDTO } from '../../../core/models/product/product-detail.dto';
import { FileDTO } from '../../../core/models/product/file.dto';
import { ReviewDTO } from '../../../core/models/product/review.dto';
import Swal from 'sweetalert2';


interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

@Component({
  selector: 'app-product-details',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css'
})
export class ProductDetails implements OnInit {
  product: ProductDetailDTO | null = null;
  selectedMediaIndex: number = 0;
  selectedMedia: MediaItem = { type: 'image', url: '' };
  isInWishlist: boolean = false;
  reviews: ReviewDTO[] = [];
  relatedProducts: ProductDetailDTO[] = [];
  isDarkTheme: boolean = false;

  // Loading and error states
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.loadProduct();
    this.loadTheme();
  }

  // Load product data from backend
  loadProduct() {
    this.route.params.subscribe(params => {
      const productId = params['id'];
      if (productId) {
        this.fetchProduct(productId);
      } else {
        this.error = 'Product ID not found';
      }
    });
  }

  fetchProduct(productId: string) {
    this.isLoading = true;
    this.error = null;

    // Try to parse as number first, then as permalink
    const numericId = parseInt(productId);
    if (!isNaN(numericId)) {
      this.productService.getById(numericId).subscribe({
        next: (product) => {
          this.product = product;
          this.reviews = product.reviews;
          this.loadRelatedProducts();
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Product not found';
          this.isLoading = false;
        }
      });
    } else {
      // Try as permalink
      this.productService.getByPermalink(productId).subscribe({
        next: (product) => {
          this.product = product;
          this.reviews = product.reviews;
          this.loadRelatedProducts();
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Product not found';
          this.isLoading = false;
        }
      });
    }
  }

  // Helper method to ensure image URLs are full URLs
  private ensureFullUrl(url: string | null | undefined): string | undefined {
    if (!url) {
      console.log('ensureFullUrl: URL is null/undefined');
      return undefined;
    }

    console.log('ensureFullUrl: Processing URL:', url);

    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('ensureFullUrl: Already full URL, returning as is:', url);
      return url;
    }

    // If it's a relative URL, convert to full backend URL
    if (url.startsWith('/')) {
      const fullUrl = `http://localhost:5255${url}`;
      console.log('ensureFullUrl: Converted relative URL to full URL:', fullUrl);
      return fullUrl;
    }

    console.log('ensureFullUrl: Unknown URL format, returning as is:', url);
    return url;
  }

  mapBackendToUI(backendProduct: ProductDetailDTO): ProductDetailDTO {
    return {
      ...backendProduct,
      name: backendProduct.name || 'Untitled Product',
      description: backendProduct.description || 'No description available',
      averageRating: backendProduct.averageRating || 0,
      files: backendProduct.files || [],
      features: backendProduct.features || [],
      reviews: backendProduct.reviews || [],
      tags: backendProduct.tags || [],
      categories: backendProduct.categories || [],
      compatibility: backendProduct.compatibility || 'Universal',
      license: backendProduct.license || 'Standard License',
      updates: backendProduct.updates || 'Lifetime Updates',
      coverImageUrl: this.ensureFullUrl(backendProduct.coverImageUrl),
      previewVideoUrl: this.ensureFullUrl(backendProduct.previewVideoUrl),
      isInWishlist: backendProduct.isInWishlist || false,
      wishlistCount: backendProduct.wishlistCount || 0,
      salesCount: backendProduct.salesCount || 0,
      viewsCount: backendProduct.viewsCount || 0
    };
  }

  // Helper method to generate placeholder avatar
  getPlaceholderAvatar(username: string | undefined): string {
    const initial = (username || 'A').charAt(0);
    const colors = ['#0074e4', '#e4007f', '#00d4ff', '#6c2bd9', '#ff6b35'];
    const color = colors[initial.charCodeAt(0) % colors.length];
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
        <rect width="50" height="50" fill="${color}"/>
        <text x="25" y="32" font-family="Arial" font-size="20" fill="white" text-anchor="middle">${initial.toUpperCase()}</text>
      </svg>
    `)}`;
  }

  getMediaItems(): MediaItem[] {
    const items: MediaItem[] = [];
    if (this.product?.coverImageUrl) {
      items.push({
        type: 'image',
        url: this.ensureFullUrl(this.product.coverImageUrl) || '',
        thumbnail: this.ensureFullUrl(this.product.coverImageUrl)
      });
    }
    if (this.product?.previewVideoUrl) {
      items.push({
        type: 'video',
        url: this.ensureFullUrl(this.product.previewVideoUrl) || '',
        thumbnail: this.ensureFullUrl(this.product.coverImageUrl)
      });
    }
    return items;
  }

  createMediaFromProduct(backendProduct: ProductDetailDTO): MediaItem[] {
    const media: MediaItem[] = [];

    // Add cover image if available
    if (backendProduct.coverImageUrl) {
      const fullCoverUrl = this.ensureFullUrl(backendProduct.coverImageUrl);
      if (fullCoverUrl) {
        media.push({
          type: 'image',
          url: fullCoverUrl,
          thumbnail: fullCoverUrl
        });
      }
    }

    // Add preview video if available
    if (backendProduct.previewVideoUrl) {
      const fullVideoUrl = this.ensureFullUrl(backendProduct.previewVideoUrl);
      if (fullVideoUrl) {
        media.push({
          type: 'video',
          url: fullVideoUrl,
          thumbnail: this.ensureFullUrl(backendProduct.coverImageUrl) || fullVideoUrl
        });
      }
    }

    // Add file previews if no media available
    if (media.length === 0 && backendProduct.files && backendProduct.files.length > 0) {
      media.push({
        type: 'image',
        url: this.getPlaceholderImage('Product Files', '#2a2a2a'),
        thumbnail: this.getPlaceholderImage('Files', '#2a2a2a')
      });
    }

    return media;
  }

  calculateTotalFileSize(files?: FileDTO[]): string {
    if (!files || files.length === 0) return '0 MB';

    const totalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);

    if (totalBytes < 1024) {
      return `${totalBytes} B`;
    } else if (totalBytes < 1024 * 1024) {
      return `${(totalBytes / 1024).toFixed(2)} KB`;
    } else if (totalBytes < 1024 * 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }

  getFileFormats(files?: FileDTO[]): string {
    if (!files || files.length === 0) return 'N/A';

    const formats = new Set<string>();
    files.forEach(file => {
      const extension = file.name?.split('.').pop()?.toUpperCase();
      if (extension) formats.add(extension);
    });

    return Array.from(formats).join(', ');
  }

  setupMedia() {
    if (this.product && this.product.files && this.product.files.length > 0) {
      this.selectedMedia = {
        type: 'image',
        url: this.product.files[0].fileUrl
      };
    }
  }

  loadReviewsFromProduct(backendProduct: ProductDetailDTO) {
    this.reviews = backendProduct.reviews;
  }

  // Add review form logic
  userReview: string = '';
  userRating: number = 0;
  submittingReview: boolean = false;
  visibleReviews: number = 3;

  setUserRating(star: number): void {
    this.userRating = star;
  }

  submitReview(): void {
  if (!this.userRating || !this.userReview.trim()) {
    Swal.fire({
      icon: 'error',
      title: 'Missing Information',
      text: 'Both rating and review are required to submit your feedback!',
      customClass: {
        confirmButton: 'btn btn-primary'
      }
    });
    return;
  }

  this.submittingReview = true;
  this.productService.submitReview(this.product!.id, {
    rating: this.userRating,
    comment: this.userReview
  }).subscribe({
    next: (review: ReviewDTO) => {
      // Add the new review to the reviews array (no need to refresh the whole product)
      const newReview = {
        id: review.id,
        rating: review.rating,
        comment: review.comment || '',
        userName: review.userName,
        userAvatar: review.userAvatar,
        createdAt: review.createdAt
      };
      this.product!.reviews.unshift(newReview);

      // Update average rating
      const totalRatings = this.product!.reviews.reduce((sum, r) => sum + r.rating, 0);
      this.product!.averageRating = totalRatings / this.product!.reviews.length;

      // Reset form
      this.userReview = '';
      this.userRating = 0;
      this.submittingReview = false;

      // Show success notification
      Swal.fire({
        icon: 'success',
        title: 'Thank You!',
        text: 'Your review has been submitted successfully.',
        customClass: {
          confirmButton: 'btn btn-primary'
        },
        timer: 3000
      });
    },
    error: (error) => {
      console.error('Error submitting review:', error);
      this.submittingReview = false;

      // Handle error messages
      const errorMessage = error.error?.includes('already reviewed')
        ? 'You have already reviewed this product'
        : error.error || 'Error submitting review. Please try again.';

      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: errorMessage,
        customClass: {
          confirmButton: 'btn btn-primary'
        }
      });
    }
  });
}
  loadRelatedProducts() {
    // TODO: Implement API call to get related products
    this.relatedProducts = [];
  }

  // Helper method to generate placeholder product images
  private getPlaceholderImage(title: string, color: string): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="200" fill="${color}"/>
        <text x="150" y="100" font-family="Arial" font-size="16" fill="white" text-anchor="middle">${title}</text>
      </svg>
    `)}`;
  }

  // Media gallery methods
  selectMedia(index: number) {
    this.selectedMediaIndex = index;
    if (this.product && this.product.files && this.product.files[index]) {
      this.selectedMedia = {
        type: 'image',
        url: this.product.files[index].fileUrl
      };
    }
  }

  // Purchase methods
  addToCart() {

    if (!this.product) return;
    
    this.cartService.addToCart(this.product.id, 1).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Added to cart:', this.product?.title);
          // Redirect to cart-checkout page
          this.router.navigate(['/cart-checkout']);
        } else {
          console.error('Failed to add to cart:', response.message);
        }
      },
      error: (error) => {
        console.error('Error adding to cart:', error);
      }
    });
// =======
//     // Add to cart logic
//     console.log('Added to cart:', this.product?.name);
//     // Redirect to checkout page
//     this.router.navigate(['/checkout']);

  }

  buyNow() {
    // Buy now logic
    console.log('Buying now:', this.product?.name);
    this.router.navigate(['/checkout']);
  }

  // Wishlist methods
  toggleWishlist() {
    this.isInWishlist = !this.isInWishlist;
    console.log('Wishlist toggled:', this.isInWishlist);
  }

  // Share methods
  shareProduct() {
    if (navigator.share) {
      navigator.share({
        title: this.product?.name,
        text: `Check out this amazing product: ${this.product?.name}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      console.log('Link copied to clipboard');
    }
  }

  // Creator methods
  viewCreator() {
    // Navigate to creator profile
    console.log('Viewing creator:', { id: this.product?.creatorId, username: this.product?.creatorUsername });
  }

  // Rating distribution methods
  getRatingPercentage(rating: number): number {
    if (!this.product) return 0;
    const totalReviews = this.product.reviews.length;
    // Mock distribution - in real app, this would come from API
    const distribution = { 5: 60, 4: 25, 3: 10, 2: 3, 1: 2 };
    return (distribution[rating as keyof typeof distribution] || 0);
  }

  getRatingCount(rating: number): number {
    if (!this.product) return 0;
    const percentage = this.getRatingPercentage(rating);
    return Math.round((percentage / 100) * this.product.reviews.length);
  }

  // Theme methods
  loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme === 'dark';
    this.applyTheme();
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    this.applyTheme();
  }

  applyTheme() {
    const root = document.documentElement;
    if (this.isDarkTheme) {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
  }
}
