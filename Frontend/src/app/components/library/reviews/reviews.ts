import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { OrderService } from '../../../core/services/order.service';
import { ReviewDTO } from '../../../core/models/product/review.dto';
import { forkJoin } from 'rxjs';

interface UserReviewWithProduct {
  productId: number;
  productName: string;
  productCoverImage?: string;
  review: ReviewDTO;
  creatorUsername: string;
  purchaseDate: Date;
}

interface EditReview {
  productId: number;
  rating: number;
  comment: string;
}

@Component({
  selector: 'app-reviews',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reviews.html',
  styleUrl: './reviews.css'
})
export class Reviews implements OnInit {
  userReviews: UserReviewWithProduct[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Edit modal state
  showEditModal: boolean = false;
  editingReview: EditReview | null = null;
  isSubmitting: boolean = false;

  // Delete modal state  
  showDeleteModal: boolean = false;
  reviewToDelete: UserReviewWithProduct | null = null;

  constructor(
    private productService: ProductService,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.loadUserReviews();
  }

  loadUserReviews() {
    this.isLoading = true;
    this.errorMessage = '';
    
    // First get all purchased products
    this.orderService.getPurchasedProducts().subscribe({
      next: (purchasedProducts) => {
        const reviewPromises = purchasedProducts.map(product => 
          this.productService.getMyReview(product.productId).toPromise()
            .then(reviewResponse => {
              if (reviewResponse?.hasReview && reviewResponse.review) {
                return {
                  productId: product.productId,
                  productName: product.productName,
                  productCoverImage: product.coverImageUrl,
                  review: reviewResponse.review,
                  creatorUsername: product.creatorUsername,
                  purchaseDate: product.purchaseDate
                } as UserReviewWithProduct;
              }
              return null;
            })
            .catch(error => {
              console.error(`Error loading review for product ${product.productId}:`, error);
              return null;
            })
        );

        Promise.all(reviewPromises).then(results => {
          const userReviews = results.filter(review => review !== null) as UserReviewWithProduct[];
          
          // Add debugging and enrichment for creator info
          console.log('User reviews with products:', userReviews);
          userReviews.forEach((userReview, index) => {
            console.log(`Review ${index}:`, {
              productId: userReview.productId,
              productName: userReview.productName,
              creatorUsername: userReview.creatorUsername,
              hasCreator: !!userReview.creatorUsername,
              creatorType: typeof userReview.creatorUsername,
              creatorValue: `"${userReview.creatorUsername}"`
            });
          });
          
          // Check if any reviews need creator info and fetch it
          this.enrichReviewsWithCreatorInfo(userReviews);
        });
      },
      error: (error) => {
        this.errorMessage = 'Failed to load your reviews.';
        this.isLoading = false;
        console.error('Error loading purchased products:', error);
      }
    });
  }

  // Helper method to ensure image URLs are full URLs
  ensureFullUrl(url: string | null | undefined): string {
    if (!url) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop';
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('/')) {
      return `http://localhost:5255${url}`;
    }
    
    return url;
  }

  // Method to enrich reviews with missing creator information
  enrichReviewsWithCreatorInfo(userReviews: UserReviewWithProduct[]) {
    const reviewsNeedingCreatorInfo = userReviews.filter(
      userReview => !userReview.creatorUsername || 
                   userReview.creatorUsername.trim() === '' || 
                   userReview.creatorUsername === 'Unknown'
    );

    if (reviewsNeedingCreatorInfo.length === 0) {
      // All reviews have creator info, just set them
      this.userReviews = userReviews;
      this.isLoading = false;
      return;
    }

    console.log(`Fetching creator info for ${reviewsNeedingCreatorInfo.length} reviews...`);

    // Fetch product details for reviews missing creator info
    const productDetailRequests = reviewsNeedingCreatorInfo.map(userReview =>
      this.productService.getById(userReview.productId)
    );

    forkJoin(productDetailRequests).subscribe({
      next: (productDetails) => {
        // Update reviews with creator information from product details
        reviewsNeedingCreatorInfo.forEach((userReview, index) => {
          const productDetail = productDetails[index];
          if (productDetail?.creatorUsername) {
            userReview.creatorUsername = productDetail.creatorUsername;
            console.log(`Updated review for product ${userReview.productId} with creator: ${productDetail.creatorUsername}`);
          } else {
            console.warn(`Review for product ${userReview.productId} still missing creator info even after fetching details`);
          }
        });

        this.userReviews = userReviews;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching product details for creator info in reviews:', error);
        // Fall back to original reviews even if we couldn't fetch creator info
        this.userReviews = userReviews;
        this.isLoading = false;
      }
    });
  }

  // Generate stars array for rating display
  getStarsArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
  }

  // Format date
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Edit review
  editReview(userReview: UserReviewWithProduct) {
    this.editingReview = {
      productId: userReview.productId,
      rating: userReview.review.rating,
      comment: userReview.review.comment || ''
    };
    this.showEditModal = true;
  }

  // Save edited review
  saveEditedReview() {
    if (!this.editingReview || this.isSubmitting) return;

    this.isSubmitting = true;

    const updatedReview = {
      rating: this.editingReview.rating,
      comment: this.editingReview.comment
    };

    this.productService.updateReview(this.editingReview.productId, updatedReview).subscribe({
      next: () => {
        // Update the local review
        const reviewIndex = this.userReviews.findIndex(r => r.productId === this.editingReview!.productId);
        if (reviewIndex !== -1) {
          this.userReviews[reviewIndex].review.rating = this.editingReview!.rating;
          this.userReviews[reviewIndex].review.comment = this.editingReview!.comment;
        }
        
        this.closeEditModal();
        this.showToast('Review updated successfully!', 'success');
        this.isSubmitting = false;
      },
      error: (error: any) => {
        console.error('Error updating review:', error);
        this.showToast('Failed to update review. Please try again.', 'error');
        this.isSubmitting = false;
      }
    });
  }

  // Close edit modal
  closeEditModal() {
    this.showEditModal = false;
    this.editingReview = null;
    this.isSubmitting = false;
  }

  // Open delete confirmation modal
  confirmDeleteReview(userReview: UserReviewWithProduct) {
    this.reviewToDelete = userReview;
    this.showDeleteModal = true;
  }

  // Delete review
  deleteReview() {
    if (!this.reviewToDelete) return;

    this.productService.deleteReview(this.reviewToDelete.productId).subscribe({
      next: () => {
        // Remove from local array
        this.userReviews = this.userReviews.filter(r => r.productId !== this.reviewToDelete!.productId);
        this.closeDeleteModal();
        this.showToast('Review deleted successfully!', 'success');
      },
      error: (error: any) => {
        console.error('Error deleting review:', error);
        this.showToast('Failed to delete review. Please try again.', 'error');
      }
    });
  }

  // Close delete modal
  closeDeleteModal() {
    this.showDeleteModal = false;
    this.reviewToDelete = null;
  }

  // Navigate to product details
  viewProduct(productId: number) {
    // You can implement navigation here if needed
    console.log('View product:', productId);
  }

  // Helper method to get creator username with fallback
  getCreatorName(userReview: UserReviewWithProduct): string {
    if (userReview.creatorUsername && 
        userReview.creatorUsername.trim() !== '' && 
        userReview.creatorUsername !== 'Unknown') {
      return userReview.creatorUsername;
    }
    return 'Unknown Creator';
  }

  // Show toast notification
  showToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }
}
