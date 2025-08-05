import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { ProductDetailDTO } from '../../../core/models/product/product-detail.dto';
import { FileDTO } from '../../../core/models/product/file.dto';
import { RouterModule, RouterLink } from '@angular/router';

interface Product {
  id: number;
  title: string;
  creator: string;
  creatorAvatar: string;
  creatorProducts: number;
  price: number;
  originalPrice?: number;
  rating: number;
  ratingCount: number;
  category: string;
  description: string;
  features: string[];
  tags: string[];
  badges: string[];
  fileSize: string;
  format: string;
  compatibility: string;
  license: string;
  updates: string;
  media: MediaItem[];
  currency: string;
  productType: string;
  coverImageUrl?: string;
  previewVideoUrl?: string;
  files?: FileDTO[];
  permalink?: string;
  isInWishlist: boolean;
  wishlistCount: number;
  salesCount: number;
  viewsCount: number;
}

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface Review {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  comment: string;
  date: Date;
}

@Component({
  selector: 'app-product-details',
  imports: [CommonModule, FormsModule, RouterModule, RouterLink],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css'
})
export class ProductDetails implements OnInit {
  product: Product | null = null;
  selectedMediaIndex: number = 0;
  selectedMedia: MediaItem = { type: 'image', url: '' };
  isInWishlist: boolean = false;
  reviews: Review[] = [];
  relatedProducts: Product[] = [];
  hasMoreReviews: boolean = true;
  isDarkTheme: boolean = false;
  
  // Loading and error states
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private productService: ProductService
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
        next: (backendProduct) => {
          this.product = this.mapBackendToUI(backendProduct);
          this.setupMedia();
          this.loadReviews();
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
        next: (backendProduct) => {
          this.product = this.mapBackendToUI(backendProduct);
          this.setupMedia();
          this.loadReviews();
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

  mapBackendToUI(backendProduct: ProductDetailDTO): Product {
    return {
      id: backendProduct.id,
      title: backendProduct.name || 'Untitled Product',
      creator: backendProduct.creatorUsername || 'Unknown Creator',
      creatorAvatar: this.getPlaceholderAvatar(backendProduct.creatorUsername?.charAt(0) || 'U'),
      creatorProducts: 0, // TODO: Get from backend if available
      price: backendProduct.price,
      originalPrice: undefined, // TODO: Add to backend if needed
      rating: backendProduct.averageRating || 0,
      ratingCount: backendProduct.reviews?.length || 0,
      category: backendProduct.categories?.[0]?.name || 'Digital',
      description: backendProduct.description || 'No description available.',
      features: backendProduct.features || [], // Use actual features from backend
      tags: backendProduct.tags?.map(tag => tag.name || '').filter(name => name !== '') || [],
      badges: [], // TODO: Add to backend if needed
      fileSize: this.calculateTotalFileSize(backendProduct.files),
      format: this.getFileFormats(backendProduct.files),
      compatibility: backendProduct.compatibility || 'Universal', // Use actual compatibility from backend
      license: backendProduct.license || 'Standard License', // Use actual license from backend
      updates: backendProduct.updates || 'Lifetime Updates', // Use actual updates from backend
      media: this.createMediaFromProduct(backendProduct),
      currency: backendProduct.currency || 'USD',
      productType: backendProduct.productType || 'digital',
      coverImageUrl: this.ensureFullUrl(backendProduct.coverImageUrl),
      previewVideoUrl: this.ensureFullUrl(backendProduct.previewVideoUrl),
      files: backendProduct.files || [],
      permalink: backendProduct.permalink,
      isInWishlist: backendProduct.isInWishlist || false,
      wishlistCount: backendProduct.wishlistCount || 0,
      salesCount: backendProduct.salesCount || 0,
      viewsCount: backendProduct.viewsCount || 0
    };
  }

  // Helper method to generate placeholder avatar
  private getPlaceholderAvatar(initial: string): string {
    const colors = ['#0074e4', '#e4007f', '#00d4ff', '#6c2bd9', '#ff6b35'];
    const color = colors[initial.charCodeAt(0) % colors.length];
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
        <rect width="50" height="50" fill="${color}"/>
        <text x="25" y="32" font-family="Arial" font-size="20" fill="white" text-anchor="middle">${initial.toUpperCase()}</text>
      </svg>
    `)}`;
  }

  createMediaFromProduct(backendProduct: ProductDetailDTO): MediaItem[] {
    const media: MediaItem[] = [];
    
    // Add multiple cover images if available
    if (backendProduct.coverImages && backendProduct.coverImages.length > 0) {
      backendProduct.coverImages.forEach(imageUrl => {
        const fullImageUrl = this.ensureFullUrl(imageUrl);
        if (fullImageUrl) {
          media.push({
            type: 'image',
            url: fullImageUrl,
            thumbnail: fullImageUrl
          });
        }
      });
    }
    
    // Fallback to single cover image if no multiple cover images
    if (media.length === 0 && backendProduct.coverImageUrl) {
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
    
    // Mock calculation - in real app, you'd get actual file sizes from backend
    const totalSize = files.length * 10; // 10MB per file for demo
    return `${totalSize} MB`;
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
    if (this.product && this.product.media && this.product.media.length > 0) {
      this.selectedMedia = this.product.media[0];
    }
  }

  loadReviews() {
    // Mock reviews data - in real app, this would come from API
    this.reviews = [
      {
        id: 1,
        name: 'John Doe',
        avatar: this.getPlaceholderAvatar('J'),
        rating: 5,
        comment: 'Excellent quality! The 3D models are very detailed and well-optimized.',
        date: new Date('2024-01-15')
      },
      {
        id: 2,
        name: 'Sarah Smith',
        avatar: this.getPlaceholderAvatar('S'),
        rating: 4,
        comment: 'Great value for money. The documentation is comprehensive.',
        date: new Date('2024-01-10')
      }
    ];
  }

  loadRelatedProducts() {
    // Mock related products data - in real app, this would come from API
    this.relatedProducts = [
      {
        id: 2,
        title: 'Fantasy Character Pack',
        creator: 'DigitalArt Studio',
        creatorAvatar: this.getPlaceholderAvatar('D'),
        creatorProducts: 24,
        price: 24.99,
        rating: 4.7,
        ratingCount: 89,
        category: '3D Design',
        description: 'Fantasy character collection with unique designs.',
        features: ['5 fantasy characters', 'Multiple animations', 'Texture variations'],
        tags: ['Fantasy', '3D', 'Characters'],
        badges: ['Popular'],
        fileSize: '1.8 GB',
        format: 'FBX, OBJ',
        compatibility: 'Unity, Unreal',
        license: 'Commercial',
        updates: '1 Year Updates',
        media: [{ type: 'image', url: this.getPlaceholderImage('Fantasy Pack', '#6c2bd9') }],
        currency: 'USD',
        productType: 'digital',
        isInWishlist: false,
        wishlistCount: 0,
        salesCount: 0,
        viewsCount: 0
      },
      {
        id: 3,
        title: 'Sci-Fi Environment Kit',
        creator: 'DigitalArt Studio',
        creatorAvatar: this.getPlaceholderAvatar('D'),
        creatorProducts: 24,
        price: 34.99,
        rating: 4.9,
        ratingCount: 156,
        category: '3D Design',
        description: 'Complete sci-fi environment with modular pieces.',
        features: ['Modular design', 'PBR textures', 'Lighting setup'],
        tags: ['Sci-Fi', 'Environment', 'Modular'],
        badges: ['Best Seller'],
        fileSize: '3.2 GB',
        format: 'FBX, OBJ, PNG',
        compatibility: 'Unity, Unreal, Blender',
        license: 'Commercial',
        updates: 'Lifetime Updates',
        media: [{ type: 'image', url: this.getPlaceholderImage('Sci-Fi Kit', '#00d4ff') }],
        currency: 'USD',
        productType: 'digital',
        isInWishlist: false,
        wishlistCount: 0,
        salesCount: 0,
        viewsCount: 0
      }
    ];
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
    this.selectedMedia = this.product!.media[index];
  }

  // Purchase methods
  addToCart() {
    // Add to cart logic
    console.log('Added to cart:', this.product?.title);
    // Redirect to checkout page
    this.router.navigate(['/checkout']);
  }

  buyNow() {
    // Buy now logic
    console.log('Buying now:', this.product?.title);
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
        title: this.product?.title,
        text: `Check out this amazing product: ${this.product?.title}`,
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
    console.log('Viewing creator:', this.product?.creator);
  }

  // Review methods
  loadMoreReviews() {
    // Load more reviews logic
    console.log('Loading more reviews...');
    this.hasMoreReviews = false;
  }

  // Rating distribution methods
  getRatingPercentage(rating: number): number {
    if (!this.product) return 0;
    const totalReviews = this.product.ratingCount;
    // Mock distribution - in real app, this would come from API
    const distribution = { 5: 60, 4: 25, 3: 10, 2: 3, 1: 2 };
    return (distribution[rating as keyof typeof distribution] || 0);
  }

  getRatingCount(rating: number): number {
    if (!this.product) return 0;
    const percentage = this.getRatingPercentage(rating);
    return Math.round((percentage / 100) * this.product.ratingCount);
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
