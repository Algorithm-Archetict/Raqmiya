import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { ProductListItemDTO } from '../../core/models/product/product-list-item.dto';

interface Product {
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
  // Wishlist properties
  inWishlist: boolean;
  loadingWishlist: boolean;
  wishlistHovered: boolean;
}

@Component({
  selector: 'app-discover',
  imports: [CommonModule, FormsModule],
  templateUrl: './discover.html',
  styleUrl: './discover.css'
})
export class Discover implements OnInit {
  @ViewChild('carouselContainer') carouselContainer!: ElementRef;

  // Search and Filter Properties
  searchQuery: string = '';
  selectedCategory: string = 'all';
  priceRange: number = 1000; // Increased from 50 to 1000 to show all products
  selectedRating: number = 0;
  selectedTags: string[] = [];
  sortBy: string = 'relevance';
  loading: boolean = false;

  // Product Data
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  recommendedProducts: Product[] = [];
  popularTags: string[] = ['3D', 'Design', 'Audio', 'Templates', 'Icons', 'Fonts', 'Graphics', 'Code'];

  constructor(
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.initializeProducts();
    this.applyFilters();
  }

  // Helper method to ensure image URLs are full URLs
  private ensureFullUrl(url: string | null | undefined): string {
    if (!url) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop';
    
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative URL, convert to full backend URL
    if (url.startsWith('/')) {
      return `http://localhost:5255${url}`;
    }
    
    return url;
  }

  // Initialize product data from API
  initializeProducts() {
    this.loading = true;
    console.log('Starting to load products...');
    
    this.productService.getProductList(1, 1000).subscribe({
      next: (products: ProductListItemDTO[]) => {
        console.log('Loaded products from API:', products);
        console.log('Loaded products count:', products.length);
        
        this.allProducts = products.map(product => ({
          id: product.id,
          title: product.name || 'Untitled Product',
          creator: product.creatorUsername || 'Unknown Creator',
          price: product.price,
          rating: product.averageRating,
          ratingCount: product.salesCount, // Using sales count as rating count for demo
          image: this.ensureFullUrl(product.coverImageUrl),
          category: 'design', // Default category, you might want to add this to the DTO
          tags: ['Design'], // Default tags, you might want to add this to the DTO
          badge: product.isPublic ? 'Public' : 'Private',
          // Initialize wishlist properties
          inWishlist: false,
          loadingWishlist: false,
          wishlistHovered: false
        }));
        
        this.recommendedProducts = this.allProducts.slice(0, 6);
        this.filteredProducts = [...this.allProducts];
        this.loading = false;
        
        console.log('Mapped products count:', this.allProducts.length);
        console.log('Filtered products count:', this.filteredProducts.length);
        
        // Load wishlist status for all products
        this.loadWishlistStatus();
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
        // Fallback to empty array if API fails
        this.allProducts = [];
        this.recommendedProducts = [];
        this.filteredProducts = [];
        this.loading = false;
      }
    });
  }

  // Load wishlist status for all products
  loadWishlistStatus() {
    this.productService.getWishlist().subscribe({
      next: (wishlistProducts: ProductListItemDTO[]) => {
        const wishlistIds = wishlistProducts.map(p => p.id);
        
        // Update wishlist status for all products
        this.allProducts.forEach(product => {
          product.inWishlist = wishlistIds.includes(product.id);
        });
        
        // Update filtered products
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading wishlist status:', error);
        // Continue without wishlist status if API fails
        // Set all products as not in wishlist
        this.allProducts.forEach(product => {
          product.inWishlist = false;
        });
        this.applyFilters();
      }
    });
  }

  // Toggle wishlist for a product
  toggleWishlist(product: Product, event: Event) {
    // Prevent event bubbling to avoid triggering product view
    event.stopPropagation();
    
    if (product.loadingWishlist) {
      return; // Prevent multiple clicks while loading
    }

    console.log('Toggling wishlist for product:', product.id, 'Current state:', product.inWishlist);
    product.loadingWishlist = true;

    const apiCall = product.inWishlist 
      ? this.productService.removeFromWishlist(product.id)
      : this.productService.addToWishlist(product.id);

    apiCall.subscribe({
      next: (response) => {
        console.log('Wishlist toggle success response:', response);
        // Toggle wishlist status
        product.inWishlist = !product.inWishlist;
        product.loadingWishlist = false;
        
        // Show success message
        this.showWishlistMessage(product.title, product.inWishlist);
      },
      error: (error) => {
        console.error('Error toggling wishlist:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          ok: error.ok
        });
        product.loadingWishlist = false;
        
        // Handle specific error cases
        if (error.status === 400) {
          // 400 error usually means the product is already in/out of wishlist
          // Refresh the wishlist status to sync with server
          console.log('400 error - refreshing wishlist status to sync with server');
          this.loadWishlistStatus();
          
          // Show a more specific message
          const action = product.inWishlist ? 'remove from' : 'add to';
          this.showWishlistMessage(`Product is already ${action} wishlist`, product.inWishlist, true);
        } else if (error.status === 401) {
          this.showWishlistMessage('Please log in to manage your wishlist', product.inWishlist, true);
        } else if (error.status === 404) {
          this.showWishlistMessage('Product not found', product.inWishlist, true);
        } else {
          // Show generic error message
          this.showWishlistMessage(product.title, product.inWishlist, true);
        }
      }
    });
  }

  // Show wishlist action message
  showWishlistMessage(productTitle: string, added: boolean, isError: boolean = false) {
    const message = isError 
      ? `Failed to ${added ? 'add' : 'remove'} "${productTitle}" from wishlist`
      : `"${productTitle}" ${added ? 'added to' : 'removed from'} wishlist`;
    
    // Create and show a toast notification
    this.showToast(message, isError ? 'error' : 'success');
  }

  // Show toast notification
  showToast(message: string, type: 'success' | 'error' = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  // Handle wishlist button hover
  onWishlistHover(product: Product, isHovered: boolean, event: Event) {
    event.stopPropagation();
    product.wishlistHovered = isHovered;
  }

  // Search functionality
  onSearch() {
    this.applyFilters();
  }

  // Category filtering
  filterByCategory(category: string) {
    this.selectedCategory = category;
    this.applyFilters();
  }

  // Price range filtering
  onPriceRangeChange() {
    this.applyFilters();
  }

  // Rating filtering
  filterByRating(rating: number) {
    this.selectedRating = rating;
    this.applyFilters();
  }

  // Tag filtering
  toggleTag(tag: string) {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
    this.applyFilters();
  }

  // Sort functionality
  onSortChange() {
    this.applyFilters();
  }

  // Apply all filters
  applyFilters() {
    console.log('Applying filters...');
    console.log('All products before filtering:', this.allProducts.length);
    console.log('Product prices:', this.allProducts.map(p => ({ id: p.id, title: p.title, price: p.price })));
    console.log('Search query:', this.searchQuery);
    console.log('Selected category:', this.selectedCategory);
    console.log('Price range:', this.priceRange);
    console.log('Selected rating:', this.selectedRating);
    console.log('Selected tags:', this.selectedTags);
    console.log('Sort by:', this.sortBy);
    
    let filtered = [...this.allProducts];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(query) ||
        product.creator.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
      );
      console.log('After search filter:', filtered.length);
    }

    // Category filter
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === this.selectedCategory);
      console.log('After category filter:', filtered.length);
    }

    // Price filter
    filtered = filtered.filter(product => product.price <= this.priceRange);
    console.log('After price filter:', filtered.length);
    console.log('Products after price filter:', filtered.map(p => ({ id: p.id, title: p.title, price: p.price })));

    // Rating filter
    if (this.selectedRating > 0) {
      filtered = filtered.filter(product => product.rating >= this.selectedRating);
      console.log('After rating filter:', filtered.length);
    }

    // Tags filter
    if (this.selectedTags.length > 0) {
      filtered = filtered.filter(product => 
        this.selectedTags.some(tag => product.tags.includes(tag))
      );
      console.log('After tags filter:', filtered.length);
    }

    // Sort
    switch (this.sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.id - a.id);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        filtered.sort((a, b) => b.ratingCount - a.ratingCount);
        break;
      default:
        // Relevance - keep original order
        break;
    }

    this.filteredProducts = filtered;
    console.log('Final filtered products:', this.filteredProducts.length);
  }

  // Carousel functionality
  scrollCarousel(direction: 'left' | 'right') {
    const container = this.carouselContainer.nativeElement;
    const scrollAmount = 300;
    
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  // Load more products
  loadMoreProducts() {
    this.loading = true;
    
    // Simulate API call
    setTimeout(() => {
      // Add more mock products
      const newProducts: Product[] = [
        {
          id: 9,
          title: 'Advanced 3D Modeling Kit',
          creator: '3D Expert',
          price: 59.99,
          rating: 4.8,
          ratingCount: 145,
          image: 'https://via.placeholder.com/300x200/0074e4/ffffff?text=3D+Modeling',
          category: '3d',
          tags: ['3D', 'Modeling', 'Advanced'],
          inWishlist: false,
          loadingWishlist: false,
          wishlistHovered: false
        },
        {
          id: 10,
          title: 'Premium Font Collection',
          creator: 'Typography Pro',
          price: 18.99,
          rating: 4.7,
          ratingCount: 89,
          image: 'https://via.placeholder.com/300x200/6c2bd9/ffffff?text=Font+Collection',
          category: 'design',
          tags: ['Fonts', 'Typography', 'Design'],
          inWishlist: false,
          loadingWishlist: false,
          wishlistHovered: false
        }
      ];

      this.allProducts.push(...newProducts);
      this.applyFilters();
      this.loading = false;
    }, 1000);
  }

  // Navigate to product details
  viewProduct(productId: number) {
    this.router.navigate(['/discover', productId]);
  }
}
