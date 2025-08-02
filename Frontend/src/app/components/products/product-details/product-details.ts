import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

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
  imports: [CommonModule, FormsModule],
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

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadProduct();
    this.loadReviews();
    this.loadRelatedProducts();
    this.loadTheme();
  }

  // Load product data
  loadProduct() {
    // Mock product data - in real app, this would come from API
    this.product = {
      id: 1,
      title: 'Epic 3D Character Pack - Professional Game Assets',
      creator: 'DigitalArt Studio',
      creatorAvatar: 'https://via.placeholder.com/50x50/0074e4/ffffff?text=DS',
      creatorProducts: 24,
      price: 29.99,
      originalPrice: 39.99,
      rating: 4.8,
      ratingCount: 156,
      category: '3D Design',
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
        
        <p>All models are optimized for real-time rendering and include normal maps, 
        specular maps, and ambient occlusion maps for maximum visual quality.</p>
      `,
      features: [
        '10 fully rigged 3D characters',
        'Multiple texture variations',
        'Animation sets included',
        'LOD models for performance',
        'Complete documentation',
        'Commercial license included'
      ],
      tags: ['3D', 'Character', 'Game Assets', 'Rigged', 'Animated'],
      badges: ['Popular', 'Best Seller'],
      fileSize: '2.4 GB',
      format: 'FBX, OBJ, PNG',
      compatibility: 'Unity, Unreal Engine, Blender',
      license: 'Commercial',
      updates: 'Free updates for 1 year',
      media: [
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1744359678374-4769eacf44d6?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        },
        {
          type: 'video',
          url: 'https://www.youtube.com/embed/gA6r7iVzP6M?si=5IyIzh7I4fK7EfzO'
        },
        {
          type: 'image',
          url: 'https://via.placeholder.com/800x600/6c2bd9/ffffff?text=Character+Preview+2'
        },
        {
          type: 'image',
          url: 'https://via.placeholder.com/800x600/00d4ff/ffffff?text=Character+Preview+3'
        }
      ]
    };

    this.selectedMedia = this.product.media[0];
  }

  // Load reviews
  loadReviews() {
    this.reviews = [
      {
        id: 1,
        name: 'Alex Johnson',
        avatar: 'https://via.placeholder.com/40x40/0074e4/ffffff?text=AJ',
        rating: 5,
        comment: 'Amazing quality! The characters are well-rigged and the textures are fantastic. Highly recommend for any game project.',
        date: new Date('2024-01-15')
      },
      {
        id: 2,
        name: 'Sarah Chen',
        avatar: 'https://via.placeholder.com/40x40/6c2bd9/ffffff?text=SC',
        rating: 4,
        comment: 'Great value for money. The models work perfectly in Unity. Only giving 4 stars because the documentation could be more detailed.',
        date: new Date('2024-01-10')
      },
      {
        id: 3,
        name: 'Mike Rodriguez',
        avatar: 'https://via.placeholder.com/40x40/00d4ff/ffffff?text=MR',
        rating: 5,
        comment: 'Perfect for my indie game! The animations are smooth and the file sizes are optimized. Will definitely buy more from this creator.',
        date: new Date('2024-01-08')
      }
    ];
  }

  // Load related products
  loadRelatedProducts() {
    this.relatedProducts = [
      {
        id: 2,
        title: 'Modern UI Design Kit',
        creator: 'Design Masters',
        creatorAvatar: 'https://via.placeholder.com/50x50/6c2bd9/ffffff?text=DM',
        creatorProducts: 15,
        price: 19.99,
        rating: 4.9,
        ratingCount: 89,
        category: 'Design',
        description: 'Modern UI design kit',
        features: ['UI', 'Design', 'Templates'],
        tags: ['Design', 'UI', 'Templates'],
        badges: [],
        fileSize: '150 MB',
        format: 'Figma, Sketch, PNG',
        compatibility: 'Figma, Sketch, Adobe XD',
        license: 'Commercial',
        updates: 'Free updates',
        media: [{ type: 'image', url: 'https://via.placeholder.com/300x200/6c2bd9/ffffff?text=UI+Kit' }]
      },
      {
        id: 3,
        title: 'Epic Sound Effects Bundle',
        creator: 'Audio Pro',
        creatorAvatar: 'https://via.placeholder.com/50x50/00d4ff/ffffff?text=AP',
        creatorProducts: 32,
        price: 15.99,
        rating: 4.7,
        ratingCount: 234,
        category: 'Sound',
        description: 'Epic sound effects bundle',
        features: ['Audio', 'Sound Effects', 'Game Audio'],
        tags: ['Audio', 'Sound Effects', 'Game Audio'],
        badges: [],
        fileSize: '500 MB',
        format: 'WAV, MP3',
        compatibility: 'All DAWs',
        license: 'Commercial',
        updates: 'Free updates',
        media: [{ type: 'image', url: 'https://via.placeholder.com/300x200/00d4ff/ffffff?text=Sound+Effects' }]
      }
    ];
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
