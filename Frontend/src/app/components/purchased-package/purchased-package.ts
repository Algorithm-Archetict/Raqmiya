import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrderService } from '../../core/services/order.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface PurchasedProduct {
  productId: number;
  productName: string;
  productPermalink: string;
  coverImageUrl?: string;
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
  size?: string;
  icon?: string;
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private orderService: OrderService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadPurchasedProduct();
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
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading product details:', error);
        this.errorMessage = 'Failed to load product details.';
        this.isLoading = false;
      }
    });
  }

  backToLibrary() {
    this.router.navigate(['/purchased-products']);
  }

  setRating(rating: number) {
    this.userRating = rating;
  }

  submitRating() {
    if (this.userRating > 0) {
      // In real app, this would send to API
      // Submit rating and review
      this.isRatingSubmitted = true;
    }
  }

  editReview() {
    this.isRatingSubmitted = false;
  }

  viewReceipt() {
    if (this.product) {
      // Navigate to receipt view
      alert(`Receipt for Order: ${this.product.orderId}\nDate: ${this.product.purchaseDate.toLocaleDateString()}\nAmount: $${this.product.purchasePrice}`);
    }
  }

  resendReceipt() {
    // In real app, this would trigger email resend
    // Resend receipt to user's email
    alert('Receipt has been resent to your email address.');
  }

  async downloadFile(file: ProductFile) {
    // Download file functionality
    if (!this.product) {
      console.error('No product found');
      return;
    }
    
    this.isDownloading = true;
    this.downloadProgress = 0;

    try {
      // Simulate download progress
      const interval = setInterval(() => {
        this.downloadProgress += Math.random() * 20;
        if (this.downloadProgress >= 100) {
          this.downloadProgress = 100;
          clearInterval(interval);
          this.isDownloading = false;
          
          // Trigger actual download
          this.triggerDownload(file);
        }
      }, 200);
    } catch (error) {
      console.error('Download error:', error);
      this.isDownloading = false;
      alert('Download failed. Please try again.');
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
        alert('Download completed successfully!');
      },
      error: (error) => {
        console.error('Download failed:', error);
        if (error.status === 401) {
          alert('Download failed: Please log in again to download files.');
        } else if (error.status === 403) {
          alert('Download failed: You do not have access to this file.');
        } else if (error.status === 404) {
          alert('Download failed: File not found.');
        } else {
          alert('Download failed: Please try again later.');
        }
      }
    });
  }

  viewCreator() {
    // In real app, this would navigate to creator profile
    // Navigate to creator profile
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

  formatFileSize(size: string): string {
    return size;
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
}
