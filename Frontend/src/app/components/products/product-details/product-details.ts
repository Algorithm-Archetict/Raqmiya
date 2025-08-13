import { Component, OnInit, AfterViewInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProductDetailDTO } from '../../../core/models/product/product-detail.dto';
import { FileDTO } from '../../../core/models/product/file.dto';
import { ReviewDTO } from '../../../core/models/product/review.dto';
import { environment } from '../../../../environments/environment';
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
export class ProductDetails implements OnInit, AfterViewInit {
  product: ProductDetailDTO | null = null;
  selectedMediaIndex: number = 0;
  selectedMedia: MediaItem = { type: 'image', url: '' };
  isInWishlist: boolean = false;
  loadingWishlist: boolean = false;
  wishlistHovered: boolean = false;
  reviews: ReviewDTO[] = [];
  relatedProducts: ProductDetailDTO[] = [];
  isDarkTheme: boolean = false;

  // Cart state
  isInCart: boolean = false;
  checkingCartStatus: boolean = false;

  // Loading and error states
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService
  ) {}

  // Check if a review belongs to the current user
  isMyReview(review: ReviewDTO): boolean {
    const currentUser = this.authService.getCurrentUser();
    return !!(currentUser && review.userName === currentUser.username);
  }

  // Edit a specific review
  editSpecificReview(review: ReviewDTO): void {
    this.existingReview = review;
    this.userRating = review.rating;
    this.userReview = review.comment || '';
    this.isEditingReview = true;
    // Scroll to the review form area
    setTimeout(() => {
      const reviewFormElement = document.querySelector('.add-review-form');
      if (reviewFormElement) {
        reviewFormElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  // Delete a specific review
  deleteSpecificReview(review: ReviewDTO): void {
    Swal.fire({
      title: 'Delete Review?',
      text: 'Are you sure you want to delete your review? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-secondary'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.productService.deleteReview(this.product!.id).subscribe({
          next: () => {
            // Remove the review from the reviews array
            this.reviews = this.reviews.filter(r => r.id !== review.id);
            this.existingReview = null;
            this.userRating = 0;
            this.userReview = '';
            this.isEditingReview = false;

            // Update the average rating
            if (this.reviews.length > 0) {
              const totalRatings = this.reviews.reduce((sum, r) => sum + r.rating, 0);
              this.product!.averageRating = totalRatings / this.reviews.length;
            } else {
              this.product!.averageRating = 0;
            }

            Swal.fire({
              icon: 'success',
              title: 'Review Deleted!',
              text: 'Your review has been deleted successfully.',
              customClass: {
                confirmButton: 'btn btn-primary'
              }
            });
          },
          error: (error) => {
            console.error('Error deleting review:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: 'Failed to delete review. Please try again.',
              customClass: {
                confirmButton: 'btn btn-primary'
              }
            });
          }
        });
      }
    });
  }

  ngOnInit() {
    this.loadProduct();
    this.loadTheme();
  }

  ngAfterViewInit() {
    // Refresh wishlist and cart status after component is fully loaded
    // This handles cases where user navigated from discover page
    setTimeout(() => {
      this.refreshWishlistStatus();
      this.checkCartStatus(); // Also check cart status
    }, 100);
  }

  // Refresh wishlist status by checking current user's wishlist
  refreshWishlistStatus() {
    if (!this.authService.isLoggedIn() || !this.product) {
      return;
    }

    this.productService.getWishlist().subscribe({
      next: (wishlistProducts: any[]) => {
        const wishlistIds = wishlistProducts.map(p => p.id);
        const wasInWishlist = this.isInWishlist;
        this.isInWishlist = wishlistIds.includes(this.product!.id);
        
        // Log the change for debugging
        if (wasInWishlist !== this.isInWishlist) {
          console.log(`Wishlist status updated for product ${this.product!.id}: ${wasInWishlist} -> ${this.isInWishlist}`);
        }
      },
      error: (error) => {
        console.error('Error refreshing wishlist status:', error);
      }
    });
  }

  // Load product data from backend
  loadProduct() {
    this.route.params.subscribe(params => {
      const productId = params['id'];
      if (productId) {
        this.fetchProduct(productId);
        // Also refresh wishlist status when route changes
        setTimeout(() => {
          this.refreshWishlistStatus();
        }, 500); // Small delay to ensure product is loaded first
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
          this.isInWishlist = product.isInWishlist || false;
          
          // Initialize selected media with the first media item (cover image)
          this.initializeSelectedMedia();
          
          this.checkPurchaseAndReviewStatus(); // Check if user can review
          this.checkCartStatus(); // Check if product is in cart
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
          this.isInWishlist = product.isInWishlist || false;
          
          // Initialize selected media with the first media item (cover image)
          this.initializeSelectedMedia();
          
          this.checkPurchaseAndReviewStatus(); // Check if user can review
          this.checkCartStatus(); // Check if product is in cart
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
      return undefined;
    }

    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If it's a relative URL, convert to full backend URL
    if (url.startsWith('/')) {
      // Extract the base URL from the API URL (remove /api suffix)
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}${url}`;
    }

    // Unknown URL format, return as is
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

  // Helper method to get user avatar with proper URL handling
  getUserAvatar(userAvatar: string | null | undefined, userName: string | undefined): string {
    if (userAvatar) {
      return this.ensureFullUrl(userAvatar) || this.getPlaceholderAvatar(userName);
    }
    return this.getPlaceholderAvatar(userName);
  }

  // Handle image loading errors
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const userName = img.alt;
    img.src = this.getPlaceholderAvatar(userName);
  }

  getMediaItems(): MediaItem[] {
    const items: MediaItem[] = [];
    
    // Always add cover image first if available
    if (this.product?.coverImageUrl) {
      items.push({
        type: 'image',
        url: this.ensureFullUrl(this.product.coverImageUrl) || '',
        thumbnail: this.ensureFullUrl(this.product.coverImageUrl)
      });
    }
    
    // Add preview video if available
    if (this.product?.previewVideoUrl) {
      items.push({
        type: 'video',
        url: this.ensureFullUrl(this.product.previewVideoUrl) || '',
        thumbnail: this.ensureFullUrl(this.product.coverImageUrl) || this.ensureFullUrl(this.product.previewVideoUrl)
      });
    }
    
    // If no cover image or video, add a placeholder
    if (items.length === 0) {
      items.push({
        type: 'image',
        url: this.getPlaceholderImage('Product Image', '#2a2a2a'),
        thumbnail: this.getPlaceholderImage('Product', '#2a2a2a')
      });
    }
    
    return items;
  }

  // Initialize selected media with the first media item (cover image)
  initializeSelectedMedia() {
    const mediaItems = this.getMediaItems();
    if (mediaItems.length > 0) {
      this.selectedMedia = mediaItems[0];
      this.selectedMediaIndex = 0;
    }
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

  // Check if user has purchased the product and load their existing review
  checkPurchaseAndReviewStatus(): void {
    if (!this.isLoggedIn() || !this.product) return;

    this.loadingPurchaseStatus = true;

    // Check purchase status
    this.productService.checkPurchaseStatus(this.product.id).subscribe({
      next: (response) => {
        this.hasPurchased = response.hasPurchased;
        
        if (this.hasPurchased) {
          // If user has purchased, check if they have an existing review
                      this.productService.getMyReview(this.product!.id).subscribe({
              next: (reviewResponse) => {
                console.log('My review response:', reviewResponse);
                if (reviewResponse.hasReview && reviewResponse.review) {
                  this.existingReview = reviewResponse.review;
                  this.userRating = reviewResponse.review.rating;
                  this.userReview = reviewResponse.review.comment || '';
                  console.log('Loaded existing review:', this.existingReview);
                }
                this.loadingPurchaseStatus = false;
              },
            error: (error) => {
              console.error('Error loading user review:', error);
              this.loadingPurchaseStatus = false;
            }
          });
        } else {
          this.loadingPurchaseStatus = false;
        }
      },
      error: (error) => {
        console.error('Error checking purchase status:', error);
        this.loadingPurchaseStatus = false;
      }
    });
  }

  // Add review form logic
  userReview: string = '';
  userRating: number = 0;
  submittingReview: boolean = false;
  visibleReviews: number = 3;
  
  // Purchase and review status
  hasPurchased: boolean = false;
  loadingPurchaseStatus: boolean = false;
  existingReview: ReviewDTO | null = null;
  isEditingReview: boolean = false;

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
    
    const reviewData = {
      rating: this.userRating,
      comment: this.userReview
    };

    // Check if this is an update or new review
    const serviceCall = this.existingReview 
      ? this.productService.updateReview(this.product!.id, reviewData)
      : this.productService.submitReview(this.product!.id, reviewData);

    serviceCall.subscribe({
      next: (review: ReviewDTO) => {
        console.log('Review submission response:', review);
        if (this.existingReview) {
          // Update existing review in the list
          const reviewIndex = this.product!.reviews.findIndex(r => r.id === this.existingReview!.id);
          if (reviewIndex !== -1) {
            this.product!.reviews[reviewIndex] = {
              id: review.id || this.existingReview.id,
              rating: review.rating,
              comment: review.comment || '',
              userName: review.userName,
              userAvatar: review.userAvatar,
              createdAt: review.createdAt
            };
          }
          this.existingReview = {
            id: review.id || this.existingReview.id,
            rating: review.rating,
            comment: review.comment || '',
            userName: review.userName,
            userAvatar: review.userAvatar,
            createdAt: review.createdAt
          };
        } else {
          // Add the new review to the reviews array
          const newReview = {
            id: review.id,
            rating: review.rating,
            comment: review.comment || '',
            userName: review.userName,
            userAvatar: review.userAvatar,
            createdAt: review.createdAt
          };
          this.product!.reviews.unshift(newReview);
          this.existingReview = newReview;
        }

        // Update the average rating
        const totalRatings = this.product!.reviews.reduce((sum, r) => sum + r.rating, 0);
        this.product!.averageRating = totalRatings / this.product!.reviews.length;

        this.submittingReview = false;
        this.isEditingReview = false;

        // Show success notification
        Swal.fire({
          icon: 'success',
          title: this.existingReview ? 'Review Updated!' : 'Thank You!',
          text: this.existingReview ? 'Your review has been updated successfully.' : 'Your review has been submitted successfully.',
          customClass: {
            confirmButton: 'btn btn-primary'
          },
          timer: 3000
        });
      },
      error: (error) => {
        console.error('Error submitting review:', error);
        this.submittingReview = false;
        
        // Handle specific error messages
        const errorMessage = error.error?.includes('already reviewed')
          ? 'You have already reviewed this product'
          : error.error?.includes('only review products you have purchased')
          ? 'You can only review products you have purchased'
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

  editReview(): void {
    if (this.existingReview) {
      this.userRating = this.existingReview.rating;
      this.userReview = this.existingReview.comment || '';
    }
    this.isEditingReview = true;
  }

  cancelEdit(): void {
    this.isEditingReview = false;
    if (this.existingReview) {
      this.userRating = this.existingReview.rating;
      this.userReview = this.existingReview.comment || '';
    }
  }

  deleteReview(): void {
    if (!this.existingReview) return;

    Swal.fire({
      title: 'Delete Review?',
      text: 'Are you sure you want to delete your review? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.productService.deleteReview(this.product!.id).subscribe({
          next: () => {
            // Remove review from the list
            this.product!.reviews = this.product!.reviews.filter(r => r.id !== this.existingReview!.id);
            
            // Update average rating
            if (this.product!.reviews.length > 0) {
              const totalRatings = this.product!.reviews.reduce((sum, r) => sum + r.rating, 0);
              this.product!.averageRating = totalRatings / this.product!.reviews.length;
            } else {
              this.product!.averageRating = 0;
            }

            // Reset form
            this.existingReview = null;
            this.userReview = '';
            this.userRating = 0;
            this.isEditingReview = false;

            Swal.fire({
              icon: 'success',
              title: 'Review Deleted!',
              text: 'Your review has been deleted successfully.',
              customClass: {
                confirmButton: 'btn btn-primary'
              }
            });
          },
          error: (error) => {
            console.error('Error deleting review:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Error deleting review. Please try again.',
              customClass: {
                confirmButton: 'btn btn-primary'
              }
            });
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
    const mediaItems = this.getMediaItems();
    if (mediaItems[index]) {
      this.selectedMedia = mediaItems[index];
    }
  }

  // Check if product is in cart
  checkCartStatus(): void {
    if (!this.authService.isLoggedIn() || !this.product) {
      this.isInCart = false;
      return;
    }

    this.checkingCartStatus = true;
    this.cartService.getCart().subscribe({
      next: (response) => {
        if (response.success && response.cart && response.cart.items) {
          this.isInCart = response.cart.items.some(item => item.productId === this.product!.id);
        } else {
          this.isInCart = false;
        }
        this.checkingCartStatus = false;
      },
      error: (error) => {
        console.error('Error checking cart status:', error);
        this.isInCart = false;
        this.checkingCartStatus = false;
      }
    });
  }

  // Purchase methods
  addToCart() {
    if (!this.product) return;
    
    // If already in cart, just go to cart page
    if (this.isInCart) {
      this.router.navigate(['/cart-checkout']);
      return;
    }
    
    this.cartService.addToCart(this.product.id, 1).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Added to cart:', this.product?.name);
          this.isInCart = true; // Update local state
          // Redirect to cart-checkout page
          this.router.navigate(['/cart-checkout']);
        } else {
          console.error('Failed to add to cart:', response.message);
        }
      },
      error: (error) => {
        // Check if it's a duplicate item error (400 Bad Request)
        if (error.status === 400) {
          // Product is likely already in cart, update state and redirect
          console.log('Product already in cart, redirecting to cart page');
          this.isInCart = true;
          this.router.navigate(['/cart-checkout']);
        } else {
          // Only log unexpected errors
          console.error('Unexpected error adding to cart:', error);
        }
      }
    });
  }

  // Get button text based on cart status
  getCartButtonText(): string {
    if (this.checkingCartStatus) {
      return 'Checking...';
    }
    return this.isInCart ? 'View In Cart' : 'Add To Cart';
  }

  // Check if cart button should be disabled
  isCartButtonDisabled(): boolean {
    return this.checkingCartStatus;
  }

  buyNow() {
    // Buy now logic
    console.log('Buying now:', this.product?.name);
    this.router.navigate(['/cart-checkout']);
  }

  // Navigate to library when product is already purchased
  goToLibrary() {
    this.router.navigate(['/library']);
  }

  // Wishlist methods
  toggleWishlist(event?: Event) {
    // Prevent event bubbling
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // Prevent multiple clicks while loading
    if (this.loadingWishlist || !this.product) {
      return;
    }

    // Refresh wishlist status first to ensure we have the current state
    this.loadingWishlist = true;
    const productId = this.product.id;
    const productTitle = this.product.name;

    // First, get the current wishlist status to avoid 400 errors
    this.productService.getWishlist().subscribe({
      next: (wishlistProducts: any[]) => {
        const wishlistIds = wishlistProducts.map(p => p.id);
        const currentlyInWishlist = wishlistIds.includes(productId);
        
        // Update our local state to match the server
        this.isInWishlist = currentlyInWishlist;

        // Now perform the toggle action based on current server state
        if (currentlyInWishlist) {
          // Remove from wishlist
          this.productService.removeFromWishlist(productId).subscribe({
            next: (response: any) => {
              this.isInWishlist = false;
              this.loadingWishlist = false;
              this.showToast(`"${productTitle}" removed from wishlist`, 'success');
            },
            error: (error) => {
              console.error('Error removing from wishlist:', error);
              this.loadingWishlist = false;
              this.showToast('Failed to remove from wishlist', 'error');
              // Refresh status on error
              this.refreshWishlistStatus();
            }
          });
        } else {
          // Add to wishlist
          this.productService.addToWishlist(productId).subscribe({
            next: (response: any) => {
              this.isInWishlist = true;
              this.loadingWishlist = false;
              this.showWishlistSuccessPopup(productTitle);
            },
            error: (error) => {
              console.error('Error adding to wishlist:', error);
              this.loadingWishlist = false;
              
              // Check if it's already in wishlist (400 error)
              if (error.status === 400) {
                this.showToast('Product is already in your wishlist', 'error');
                this.isInWishlist = true; // Update state to reflect reality
              } else {
                this.showToast('Failed to add to wishlist', 'error');
              }
              
              // Refresh status on error
              this.refreshWishlistStatus();
            }
          });
        }
      },
      error: (error) => {
        console.error('Error checking wishlist status:', error);
        this.loadingWishlist = false;
        this.showToast('Failed to check wishlist status', 'error');
      }
    });
  }

  // Wishlist hover handlers
  onWishlistHover(isHovered: boolean, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.wishlistHovered = isHovered;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  // Navigate to login page
  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  // Show wishlist success popup (similar to discover page)
  showWishlistSuccessPopup(productTitle: string) {
    // Find or create toast container
    let toastContainer = document.querySelector('.toast-container') as HTMLElement;
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1003;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    
    // Add inline styles to ensure visibility
    toast.style.cssText = `
      position: relative;
      background: linear-gradient(135deg, #16a34a 0%, #059669 100%);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 12px;
      margin: 20px auto;
      max-width: 600px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      padding: 16px 20px;
      color: white;
      transform: translateY(-20px) scale(0.95);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      margin-top: 90px;
      pointer-events: auto;
    `;
    
    toast.innerHTML = `
      <div class="toast-content wishlist-content" style="background: transparent; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div class="wishlist-icon-large" style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <i class="fas fa-heart" style="color: white; font-size: 1.5rem;"></i>
        </div>
        <div class="wishlist-info" style="flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span class="wishlist-title" style="font-size: 1rem; font-weight: 600; color: white; margin: 0;">Added to Wishlist</span>
          <span class="wishlist-subtitle" style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.9); margin: 0;">"${productTitle}"</span>
          <span class="wishlist-count" style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.8); margin: 0;">1 item saved to your wishlist</span>
          <button class="btn-view-wishlist" style="padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 0.875rem; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <i class="fas fa-eye"></i>
            View Wishlist
          </button>
        </div>
        <div class="wishlist-actions" style="display: flex; align-items: center;">
          <button class="btn-close-popup" style="background: transparent; border: none; color: white; cursor: pointer; padding: 4px; font-size: 1rem;">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Show with animation
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';
    }, 50);

    // Add click handlers
    const viewWishlistBtn = toast.querySelector('.btn-view-wishlist');
    const closeBtn = toast.querySelector('.btn-close-popup');
    
    if (viewWishlistBtn) {
      viewWishlistBtn.addEventListener('click', () => {
        this.router.navigate(['/library/wishlist']);
        this.dismissToast(toast);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.dismissToast(toast);
      });
    }

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      this.dismissToast(toast);
    }, 4000);
  }

  // Helper method to dismiss toast
  private dismissToast(toast: HTMLElement) {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px) scale(0.95)';
      setTimeout(() => {
        toast.remove();
      }, 400);
    }
  }

  // Show toast notification
  showToast(message: string, type: 'success' | 'error' = 'success') {
    // Create toast for simple messages
    let toastContainer = document.querySelector('.toast-container') as HTMLElement;
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1003;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const bgColor = type === 'success' ? '#16a34a' : '#dc2626';
    toast.style.cssText = `
      position: relative;
      background: ${bgColor};
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 12px;
      margin: 20px auto;
      max-width: 400px;
      padding: 16px 20px;
      color: white;
      transform: translateY(-20px) scale(0.95);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      margin-top: 90px;
      pointer-events: auto;
      text-align: center;
    `;
    
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);

    // Show with animation
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';
    }, 50);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      this.dismissToast(toast);
    }, 3000);
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
