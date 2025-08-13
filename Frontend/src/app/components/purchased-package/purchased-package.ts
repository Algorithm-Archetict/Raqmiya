import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ReviewDTO } from '../../core/models/product/review.dto';
import Swal from 'sweetalert2';

interface PurchasedProduct {
  productId: number;
  productName: string;
  productPermalink: string;
  coverImageUrl?: string;
  thumbnailImageUrl?: string;
  creatorUsername: string;
  purchasePrice: number;
  purchaseDate: Date;
  orderId: string;
  licenseStatus: string;
  licenseExpiresAt?: Date;
  files: ProductFile[];
  productDescription: string;
  downloadGuide: string;
}

interface ProductFile {
  id: number;
  name: string;
  fileUrl: string;
  type?: string;
  size?: number; // Changed from string to number to match backend
  icon?: string;
  isDownloading?: boolean;
}

@Component({
  selector: 'app-purchased-package',
  imports: [CommonModule, FormsModule],
  templateUrl: './purchased-package.html',
  styleUrl: './purchased-package.css'
})
export class PurchasedPackage implements OnInit {
  product: PurchasedProduct | null = null;
  userRating: number = 0;
  userReview: string = '';
  isRatingSubmitted: boolean = false;
  isDownloading: boolean = false;
  downloadProgress: number = 0;
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Review-related properties
  existingReview: ReviewDTO | null = null;
  isEditingReview: boolean = false;
  submittingReview: boolean = false;
  loadingReview: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private orderService: OrderService,
    private productService: ProductService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadPurchasedProduct();
  }

  loadExistingReview() {
    if (!this.product) return;

    this.loadingReview = true;
    this.productService.getMyReview(this.product.productId).subscribe({
      next: (response) => {
        console.log('Loaded review response:', response);
        if (response.hasReview && response.review) {
          this.existingReview = response.review;
          this.userRating = response.review.rating;
          this.userReview = response.review.comment || '';
          this.isRatingSubmitted = true;
          console.log('Set userRating to:', this.userRating, 'from response.review.rating:', response.review.rating);
        } else {
          console.log('No existing review found');
        }
        this.loadingReview = false;
      },
      error: (error) => {
        console.error('Error loading existing review:', error);
        this.loadingReview = false;
      }
    });
  }

  loadPurchasedProduct() {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Get product ID from route params
    this.route.params.subscribe(params => {
      const productId = params['id'];
      if (productId) {
        this.getProductDetails(productId);
      } else {
        this.errorMessage = 'Product ID not found.';
        this.isLoading = false;
      }
    });
  }

  getProductDetails(productId: number) {
    // Get the specific purchased product directly
    this.orderService.getPurchasedProduct(productId).subscribe({
      next: (product) => {
        this.product = product;
        if (!this.product) {
          this.errorMessage = 'Product not found or you do not have access to it.';
          this.isLoading = false;
        } else {
          // Check if creator info is missing and fetch it
          this.enrichProductWithCreatorInfo();
          // Load existing review after product is loaded
          this.loadExistingReview();
        }
      },
      error: (error) => {
        console.error('Error loading product details:', error);
        this.errorMessage = 'Failed to load product details.';
        this.isLoading = false;
      }
    });
  }

  backToLibrary() {
    this.router.navigate(['/library/purchased-products']);
  }

  // Method to enrich product with missing creator information
  enrichProductWithCreatorInfo() {
    if (!this.product) return;

    // Check if creator info is missing
    if (!this.product.creatorUsername || 
        this.product.creatorUsername.trim() === '' || 
        this.product.creatorUsername === 'Unknown') {
      
      console.log(`Product ${this.product.productId} has missing creator info, fetching details...`);
      
      // Fetch product details to get creator information
      this.productService.getById(this.product.productId).subscribe({
        next: (productDetail) => {
          if (productDetail?.creatorUsername) {
            this.product!.creatorUsername = productDetail.creatorUsername;
            console.log(`Updated product ${this.product!.productId} with creator: ${productDetail.creatorUsername}`);
          } else {
            console.warn(`Product ${this.product!.productId} still missing creator info even after fetching details`);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching product details for creator info:', error);
          this.isLoading = false;
        }
      });
    } else {
      // Creator info is already available
      this.isLoading = false;
    }
  }

  setRating(rating: number) {
    console.log('setRating called with:', rating, 'current userRating:', this.userRating);
    this.userRating = rating;
  }

  submitRating() {
    if (!this.userRating || !this.product) {
      Swal.fire({
        icon: 'warning',
        title: 'Rating Required',
        text: 'Please select a rating before submitting.',
        confirmButtonText: 'OK'
      });
      return;
    }

    this.submittingReview = true;
    
    const reviewData = {
      rating: this.userRating,
      comment: this.userReview.trim() || 'No comment provided'
    };

    // Check if this is an update or new review
    const serviceCall = this.existingReview 
      ? this.productService.updateReview(this.product.productId, reviewData)
      : this.productService.submitReview(this.product.productId, reviewData);

    serviceCall.subscribe({
      next: (review: ReviewDTO) => {
        if (this.existingReview) {
          // Update existing review
          this.existingReview = {
            id: review.id || this.existingReview.id,
            rating: review.rating,
            comment: review.comment || '',
            userName: review.userName,
            userAvatar: review.userAvatar,
            createdAt: review.createdAt
          };
        } else {
          // Create new review
          this.existingReview = {
            id: review.id,
            rating: review.rating,
            comment: review.comment || '',
            userName: review.userName,
            userAvatar: review.userAvatar,
            createdAt: review.createdAt
          };
        }

        this.isRatingSubmitted = true;
        this.isEditingReview = false;
        this.submittingReview = false;

        Swal.fire({
          icon: 'success',
          title: this.existingReview ? 'Review Updated!' : 'Review Submitted!',
          text: 'Thank you for your feedback!',
          confirmButtonText: 'OK',
          timer: 3000
        });
      },
      error: (error) => {
        console.error('Error submitting review:', error);
        this.submittingReview = false;
        
        const errorMessage = error.error?.includes('already reviewed')
          ? 'You have already reviewed this product'
          : error.error || 'Error submitting review. Please try again.';
        
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
      }
    });
  }

  editReview() {
    this.isRatingSubmitted = false;
    this.isEditingReview = true;
  }

  cancelEdit() {
    this.isEditingReview = false;
    if (this.existingReview) {
      this.userRating = this.existingReview.rating;
      this.userReview = this.existingReview.comment || '';
      this.isRatingSubmitted = true;
    }
  }

  deleteReview() {
    if (!this.existingReview || !this.product) return;

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
        this.productService.deleteReview(this.product!.productId).subscribe({
          next: () => {
            // Reset review state
            this.existingReview = null;
            this.userReview = '';
            this.userRating = 0;
            this.isRatingSubmitted = false;
            this.isEditingReview = false;

            Swal.fire({
              icon: 'success',
              title: 'Review Deleted!',
              text: 'Your review has been deleted successfully.',
              confirmButtonText: 'OK'
            });
          },
          error: (error) => {
            console.error('Error deleting review:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Error deleting review. Please try again.',
              confirmButtonText: 'OK'
            });
          }
        });
      }
    });
  }

  viewReceipt() {
    if (this.product) {
      // Show receipt details in a nice modal
      Swal.fire({
        title: 'Receipt Details',
        html: `
          <div class="text-left">
            <p><strong>Order ID:</strong> ${this.product.orderId}</p>
            <p><strong>Date:</strong> ${this.product.purchaseDate.toLocaleDateString()}</p>
            <p><strong>Amount:</strong> $${this.product.purchasePrice}</p>
            <p><strong>Product:</strong> ${this.product.productName}</p>
          </div>
        `,
        icon: 'info',
        confirmButtonText: 'Close'
      });
    }
  }

  resendReceipt() {
    // In real app, this would trigger email resend
    // Resend receipt to user's email
    Swal.fire({
      icon: 'success',
      title: 'Receipt Sent!',
      text: 'Receipt has been resent to your email address.',
      confirmButtonText: 'OK',
      timer: 3000,
      timerProgressBar: true
    });
  }

  async downloadFile(file: ProductFile) {
    // Download file functionality
    if (!this.product) {
      console.error('No product found');
      return;
    }
    
    // Set downloading state for this specific file only
    file.isDownloading = true;
    this.downloadProgress = 0;

    try {
      // Simulate download progress
      const interval = setInterval(() => {
        this.downloadProgress += Math.random() * 20;
        if (this.downloadProgress >= 100) {
          this.downloadProgress = 100;
          clearInterval(interval);
          file.isDownloading = false;
          
          // Trigger actual download
          this.triggerDownload(file);
        }
      }, 200);
    } catch (error) {
      console.error('Download error:', error);
      file.isDownloading = false;
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'Failed to download file. Please try again.',
        confirmButtonText: 'OK'
      });
    }
  }

  private triggerDownload(file: ProductFile) {
    // Trigger download for file
    if (!this.product) {
      console.error('No product found in triggerDownload');
      return;
    }
    
    // Create download URL using the correct API endpoint
    const downloadUrl = `${environment.apiUrl}/download/file/${this.product.productId}/${file.id}`;
    // Create download link
    
    // Use HTTP client to download file with proper authentication
    this.http.get(downloadUrl, { 
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (response) => {
        // Create blob URL and trigger download
        const blob = new Blob([response.body!], { type: response.headers.get('content-type') || 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        window.URL.revokeObjectURL(url);
        
        // Download completed successfully
        file.isDownloading = false;
        Swal.fire({
          icon: 'success',
          title: 'Download Complete!',
          text: `"${file.name}" has been downloaded successfully.`,
          confirmButtonText: 'OK',
          timer: 3000,
          timerProgressBar: true
        });
      },
      error: (error) => {
        console.error('Download failed:', error);
        file.isDownloading = false;
        if (error.status === 401) {
          Swal.fire({
            icon: 'error',
            title: 'Authentication Required',
            text: 'Please log in again to download files.',
            confirmButtonText: 'OK'
          });
        } else if (error.status === 403) {
          Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'You do not have access to this file.',
            confirmButtonText: 'OK'
          });
        } else if (error.status === 404) {
          Swal.fire({
            icon: 'error',
            title: 'File Not Found',
            text: 'The requested file could not be found.',
            confirmButtonText: 'OK'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Download Failed',
            text: 'Failed to download file. Please try again later.',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }

  viewCreator() {
    if (this.product?.creatorUsername) {
      // Show creator profile in a nice modal
      Swal.fire({
        title: 'Creator Profile',
        html: `
          <div class="text-center">
            <h4>${this.getCreatorName()}</h4>
            <p>This would navigate to the creator's profile page.</p>
            <p><small>In a real application, this would show the creator's full profile, products, and contact information.</small></p>
          </div>
        `,
        icon: 'info',
        confirmButtonText: 'OK'
      });
    }
  }

  browseMoreProducts() {
    this.router.navigate(['/discover']);
  }

  getFileIcon(file: ProductFile): string {
    const iconMap: { [key: string]: string } = {
      'zip': 'fas fa-file-archive',
      'rar': 'fas fa-file-archive',
      'pdf': 'fas fa-file-pdf',
      'txt': 'fas fa-file-alt',
      'doc': 'fas fa-file-word',
      'docx': 'fas fa-file-word',
      'xls': 'fas fa-file-excel',
      'xlsx': 'fas fa-file-excel',
      'jpg': 'fas fa-file-image',
      'jpeg': 'fas fa-file-image',
      'png': 'fas fa-file-image',
      'gif': 'fas fa-file-image',
      'mp3': 'fas fa-file-audio',
      'wav': 'fas fa-file-audio',
      'mp4': 'fas fa-file-video',
      'avi': 'fas fa-file-video'
    };

    const extension = file.name.split('.').pop()?.toLowerCase();
    return iconMap[extension || ''] || 'fas fa-file';
  }

  formatFileSize(size: number | undefined): string {
    if (!size || size <= 0) {
      return 'Unknown';
    }
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(1024));
    const formattedSize = (size / Math.pow(1024, i)).toFixed(1);
    
    return `${formattedSize} ${sizes[i]}`;
  }

  getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const typeMap: { [key: string]: string } = {
      'pdf': 'PDF Document',
      'zip': 'ZIP Archive',
      'jpg': 'JPEG Image',
      'jpeg': 'JPEG Image',
      'png': 'PNG Image',
      'mp4': 'MP4 Video',
      'txt': 'Text File',
      'doc': 'Word Document',
      'docx': 'Word Document',
      'xls': 'Excel Spreadsheet',
      'xlsx': 'Excel Spreadsheet'
    };
    return typeMap[extension || ''] || 'File';
  }

  getRatingText(): string {
    if (this.userRating === 0) return 'Rate this product';
    if (this.userRating === 1) return 'Poor';
    if (this.userRating === 2) return 'Fair';
    if (this.userRating === 3) return 'Good';
    if (this.userRating === 4) return 'Very Good';
    if (this.userRating === 5) return 'Excellent';
    return 'Rate this product';
  }

  isAnyFileDownloading(): boolean {
    return this.product?.files?.some(file => file.isDownloading) || false;
  }

  // Helper method to get creator username with fallback
  getCreatorName(): string {
    if (this.product?.creatorUsername && 
        this.product.creatorUsername.trim() !== '' && 
        this.product.creatorUsername !== 'Unknown') {
      return this.product.creatorUsername;
    }
    return 'Unknown Creator';
  }
}
