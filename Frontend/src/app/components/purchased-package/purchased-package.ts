import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface PurchasedProduct {
  id: string;
  title: string;
  creator: string;
  creatorId: string;
  price: number;
  purchaseDate: Date;
  orderId: string;
  rating: number;
  userRating?: number;
  userReview?: string;
  files: ProductFile[];
  description: string;
  downloadGuide: string;
  image: string;
}

interface ProductFile {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
  icon: string;
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

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadPurchasedProduct();
  }

  loadPurchasedProduct() {
    // Mock purchased product data - in real app, this would come from API
    this.product = {
      id: '1',
      title: 'Epic 3D Character Pack - Professional Game Assets',
      creator: 'DigitalArt Studio',
      creatorId: 'creator-1',
      price: 29.99,
      purchaseDate: new Date('2024-01-20'),
      orderId: 'ORD-2024-001',
      rating: 4.8,
      userRating: 0,
      userReview: '',
      image: 'https://images.unsplash.com/photo-1744359678374-4769eacf44d6?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      files: [
        {
          id: '1',
          name: '3D_Character_Pack_v1.0.zip',
          type: 'ZIP Archive',
          size: '2.4 GB',
          url: '#',
          icon: 'fas fa-file-archive'
        },
        {
          id: '2',
          name: 'Documentation.pdf',
          type: 'PDF Document',
          size: '15.2 MB',
          url: '#',
          icon: 'fas fa-file-pdf'
        },
        {
          id: '3',
          name: 'Setup_Guide.txt',
          type: 'Text Document',
          size: '2.1 MB',
          url: '#',
          icon: 'fas fa-file-alt'
        }
      ],
      description: `
        <p>This comprehensive 3D character pack includes everything you need to create stunning game characters. 
        Perfect for indie developers and professional studios alike.</p>
        
        <h4>What's Included:</h4>
        <ul>
          <li>10 fully rigged 3D characters</li>
          <li>Multiple texture variations</li>
          <li>Animation sets for each character</li>
          <li>LOD models for performance optimization</li>
          <li>Complete documentation and setup guides</li>
        </ul>
      `,
      downloadGuide: `
        <h4>Download Instructions:</h4>
        <ol>
          <li>Click the "Download" button next to the file you want to download</li>
          <li>Wait for the download to complete</li>
          <li>Extract the ZIP file to your desired location</li>
          <li>Follow the setup guide included in the package</li>
          <li>Import the assets into your game engine</li>
        </ol>
        
        <p><strong>Note:</strong> You can download these files unlimited times. Keep your purchase receipt for future reference.</p>
      `
    };

    // Load user's previous rating if exists
    if (this.product.userRating) {
      this.userRating = this.product.userRating;
      this.isRatingSubmitted = true;
    }
  }

  backToLibrary() {
    this.router.navigate(['/library']);
  }

  setRating(rating: number) {
    this.userRating = rating;
  }

  submitRating() {
    if (this.userRating > 0) {
      // In real app, this would send to API
      console.log('Rating submitted:', this.userRating, 'Review:', this.userReview);
      this.isRatingSubmitted = true;
      
      // Update the product rating
      if (this.product) {
        this.product.userRating = this.userRating;
        this.product.userReview = this.userReview;
      }
    }
  }

  editReview() {
    this.isRatingSubmitted = false;
  }

  viewReceipt() {
    // In real app, this would open receipt modal or navigate to receipt page
    console.log('Viewing receipt for order:', this.product?.orderId);
    alert(`Receipt for Order: ${this.product?.orderId}\nDate: ${this.product?.purchaseDate.toLocaleDateString()}\nAmount: $${this.product?.price}`);
  }

  resendReceipt() {
    // In real app, this would trigger email resend
    console.log('Resending receipt for order:', this.product?.orderId);
    alert('Receipt has been resent to your email address.');
  }

  async downloadFile(file: ProductFile) {
    this.isDownloading = true;
    this.downloadProgress = 0;

    // Simulate download progress
    const interval = setInterval(() => {
      this.downloadProgress += Math.random() * 20;
      if (this.downloadProgress >= 100) {
        this.downloadProgress = 100;
        clearInterval(interval);
        this.isDownloading = false;
        
        // In real app, this would trigger actual file download
        console.log('Downloading file:', file.name);
        alert(`Download started for: ${file.name}`);
      }
    }, 200);
  }

  viewCreator() {
    // In real app, this would navigate to creator profile
    console.log('Viewing creator:', this.product?.creator);
    // this.router.navigate(['/creator', this.product?.creatorId]);
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
