import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { ReviewDTO } from '../../../core/models/product/review.dto';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-all-reviews',
  templateUrl: './all-reviews.html',
  styleUrl: './all-reviews.css',
  imports: [CommonModule],
  standalone: true
})
export class AllReviews implements OnInit {
  private readonly backendUrl = 'http://localhost:5255';

  productId!: number;
  reviews: ReviewDTO[] = [];
  isLoading = true;
  error: string | null = null;
  pageSize = 10;
  currentPage = 1;
  totalReviews = 0;
  sortBy: 'date' | 'rating' = 'date';
  sortOrder: 'asc' | 'desc' = 'desc';
  filterRating: number | null = null;
  ratingCounts: { [key: number]: number } = {};

  private ensureFullUrl(url: string | null | undefined): string {
    if (!url) {
      console.log('ensureFullUrl: URL is null/undefined');
      return '/assets/images/default-avatar.png';
    }

    console.log('ensureFullUrl: Processing URL:', url);

    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('ensureFullUrl: Already full URL, returning as is:', url);
      return url;
    }

    // If it's a relative URL, add the backend URL
    if (url.startsWith('/')) {
      const fullUrl = `${this.backendUrl}${url}`;
      console.log('ensureFullUrl: Converted relative URL to full URL:', fullUrl);
      return fullUrl;
    }

    console.log('ensureFullUrl: Unknown URL format, returning as is:', url);
    return url;
  }

  private getPlaceholderAvatar(initial: string): string {
    return `https://ui-avatars.com/api/?name=${initial}&background=random&size=128`;
  }

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.productId = +id;
        this.fetchReviews();
      }
    });
  }

  fetchReviews(): void {
    this.isLoading = true;
    this.error = null;

    this.productService.getById(this.productId).subscribe({
      next: (backendProduct) => {
        console.log('Raw backend product data:', JSON.stringify(backendProduct, null, 2));
        console.log('Raw reviews data:', JSON.stringify(backendProduct.reviews, null, 2));

        // Detailed logging of each review's exact structure
        backendProduct.reviews.forEach((review, index) => {
          console.log(`Review ${index + 1} raw data:`, {
            allProperties: Object.keys(review),
            rawData: review,
            username: {
              UserName: review.userName,
            }
          });
        });

        // Create fresh review objects without spreading to avoid property conflicts
        let displayReviews = backendProduct.reviews.map(review => ({
          id: review.id,
          userName: review.userName,
          rating: review.rating,
          comment: review.comment || '',
          createdAt: review.createdAt,
          userAvatar: review.userAvatar
        }));

        // Calculate rating counts
        this.ratingCounts = displayReviews.reduce((counts, review) => {
          counts[review.rating] = (counts[review.rating] || 0) + 1;
          return counts;
        }, {} as { [key: number]: number });

        // Apply rating filter if set
        if (this.filterRating !== null) {
          displayReviews = displayReviews.filter(r => r.rating === this.filterRating);
        }

        // Handle profile images
        displayReviews = displayReviews.map(review => ({
          id: review.id,
          userName: review.userName,
          rating: review.rating,
          comment: review.comment || '',
          createdAt: review.createdAt,
          userAvatar: review.userAvatar ? this.ensureFullUrl(review.userAvatar) : this.getPlaceholderAvatar(review.userName?.charAt(0) || 'A')
        }));

        // Sort reviews
        displayReviews.sort((a, b) => {
          const multiplier = this.sortOrder === 'desc' ? -1 : 1;
          if (this.sortBy === 'date') {
            return multiplier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          } else {
            return multiplier * (a.rating - b.rating);
          }
        });

        this.totalReviews = displayReviews.length;
        const startIndex = (this.currentPage - 1) * this.pageSize;
        this.reviews = displayReviews.slice(startIndex, startIndex + this.pageSize);
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load reviews.';
        this.isLoading = false;
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.totalReviews / this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchReviews();
    }
  }

  setSortBy(sort: 'date' | 'rating'): void {
    if (this.sortBy === sort) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sort;
      this.sortOrder = 'desc';
    }
    this.fetchReviews();
  }

  setFilterRating(rating: number | null): void {
    this.filterRating = rating;
    this.currentPage = 1; // Reset to first page when filtering
    this.fetchReviews();
  }

  getRatingPercentage(rating: number): number {
    if (!this.totalReviews) return 0;
    return ((this.ratingCounts[rating] || 0) / this.totalReviews) * 100;
  }

  getAverageRating(): number {
    if (!this.totalReviews) return 0;
    const totalScore = Object.entries(this.ratingCounts)
      .reduce((sum, [rating, count]) => sum + Number(rating) * count, 0);
    return totalScore / this.totalReviews;
  }

  // Handle image loading errors
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const userName = img.alt;
    img.src = this.getPlaceholderAvatar(userName?.charAt(0) || 'A');
  }
}
