import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { ProductListItemDTO } from '../../core/models/product/product-list-item.dto';
import { Navbar } from '../navbar/navbar';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { HierarchicalCategoryNav } from '../shared/hierarchical-category-nav/hierarchical-category-nav';

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
  // Purchase properties
  isPurchased: boolean;
  loadingPurchase: boolean;
}

@Component({
  selector: 'app-discover',
  imports: [CommonModule, FormsModule, RouterModule, Navbar, HierarchicalCategoryNav],
  templateUrl: './discover.html',
  styleUrl: './discover.css',
  encapsulation: ViewEncapsulation.None
})
export class Discover implements OnInit, AfterViewInit {
  @ViewChild('carouselContainer') carouselContainer!: ElementRef;

  // Search and Filter Properties
  searchQuery: string = '';
  selectedCategory: number | 'all' = 'all';
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
  
  // Wishlist Counter for Multiple Additions
  wishlistCounter: number = 0;
  private wishlistCounterTimeout: any;
  showWishlistCounterPopup: boolean = false;

  constructor(
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.initializeProducts();
    this.applyFilters();
  }

  ngAfterViewInit() {
    // Refresh wishlist status when returning to discover page
    // This handles cases where user navigated from product details
    setTimeout(() => {
      if (this.authService.isLoggedIn()) {
        this.loadWishlistStatus();
      }
    }, 200);

    // Listen for focus events to refresh wishlist when user returns to tab
    window.addEventListener('focus', () => {
      if (this.authService.isLoggedIn()) {
        this.loadWishlistStatus();
      }
    });
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
    
    this.productService.getProductList(1, 1000).subscribe({
      next: (products: ProductListItemDTO[]) => {
        this.allProducts = products.map(product => ({
          id: product.id,
          title: product.name || 'Untitled Product',
          creator: product.creatorUsername || 'Unknown Creator',
          price: product.price,
          rating: product.averageRating,
          ratingCount: 0, // Will be populated with actual review count
          image: this.ensureFullUrl(product.coverImageUrl),
          category: 'design', // Default category, you might want to add this to the DTO
          tags: ['Design'], // Default tags, you might want to add this to the DTO
          badge: product.isPublic ? 'Public' : 'Private',
          // Initialize wishlist properties
          inWishlist: false,
          loadingWishlist: false,
          wishlistHovered: false,
          // Initialize purchase properties
          isPurchased: false,
          loadingPurchase: false
        }));
        
        this.recommendedProducts = this.allProducts.slice(0, 6);
        this.filteredProducts = [...this.allProducts];
        this.loading = false;
        
        // Load wishlist status for all products
        this.loadWishlistStatus();
        
        // Load actual review counts for all products
        this.loadReviewCounts();
        
        // Load purchase status for all products
        this.loadPurchaseStatus();
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

  // Load actual review counts for all products
  loadReviewCounts() {
    // For performance, we'll only load review counts for products that have ratings > 0
    const productsWithRatings = this.allProducts.filter(product => product.rating > 0);
    
    if (productsWithRatings.length === 0) return;
    
    console.log(`Loading review counts for ${productsWithRatings.length} products with ratings...`);
    
    // Fetch product details for products with ratings to get actual review count
    productsWithRatings.forEach(product => {
      this.productService.getById(product.id).subscribe({
        next: (productDetail) => {
          if (productDetail && productDetail.reviews) {
            product.ratingCount = productDetail.reviews.length;
            console.log(`Updated product ${product.id} with ${productDetail.reviews.length} reviews`);
          }
        },
        error: (error) => {
          console.warn(`Failed to load review count for product ${product.id}:`, error);
          // Keep ratingCount as 0 if we can't fetch the details
        }
      });
    });
  }

  // Load purchase status for all products
  loadPurchaseStatus() {
    // Only check purchase status if user is logged in
    if (!this.authService.isLoggedIn()) {
      return;
    }

    console.log('Loading purchase status for products...');
    
    // Get purchased products from order service
    this.orderService.getPurchasedProducts().subscribe({
      next: (purchasedProducts) => {
        const purchasedProductIds = purchasedProducts.map(p => p.productId);
        console.log(`User has purchased ${purchasedProductIds.length} products:`, purchasedProductIds);
        
        // Update purchase status for all products
        this.allProducts.forEach(product => {
          product.isPurchased = purchasedProductIds.includes(product.id);
        });
        
        // Trigger UI update by updating filtered products
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading purchase status:', error);
        // Continue without purchase status if API fails
        // Set all products as not purchased
        this.allProducts.forEach(product => {
          product.isPurchased = false;
        });
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

    product.loadingWishlist = true;

    const apiCall = product.inWishlist 
      ? this.productService.removeFromWishlist(product.id)
      : this.productService.addToWishlist(product.id);

    apiCall.subscribe({
      next: (response) => {
        // Toggle wishlist status
        product.inWishlist = !product.inWishlist;
        product.loadingWishlist = false;
        
        // Handle success message logic
        if (product.inWishlist) {
          // Adding to wishlist - use counter system
          this.handleWishlistAddition();
        }
        // No popup for removal as requested
      },
      error: (error) => {
        product.loadingWishlist = false;
        
        // Handle specific error cases
        // Only show error popups for addition attempts, not removal
        if (!product.inWishlist) {
          if (error.status === 400) {
            this.showToast('Product is already in your wishlist', 'error');
          } else if (error.status === 401) {
            this.showToast('Please log in to manage your wishlist', 'error');
          } else if (error.status === 404) {
            this.showToast('Product not found', 'error');
          } else {
            this.showToast('Failed to add to wishlist', 'error');
          }
        }
        // Silent for removal errors as requested
      }
    });
  }

  // Handle wishlist addition with counter system
  private handleWishlistAddition() {
    this.wishlistCounter++;
    
    // Clear existing timeout if user is adding multiple items quickly
    if (this.wishlistCounterTimeout) {
      clearTimeout(this.wishlistCounterTimeout);
    }
    
    // Set a timeout to show the popup after user stops adding items
    this.wishlistCounterTimeout = setTimeout(() => {
      const message = this.wishlistCounter === 1 
        ? '1 Item saved' 
        : `${this.wishlistCounter} Items saved`;
      
      this.displayWishlistCounterPopup(message);
      this.wishlistCounter = 0; // Reset counter
    }, 1000); // Wait 1 second after last addition
  }

  // Show wishlist action message
  showWishlistMessage(productTitle: string, added: boolean, isError: boolean = false) {
    if (isError) {
      const action = added ? 'add to' : 'remove from';
      this.showToast(`Failed to ${action} wishlist`, 'error');
    } else {
      // Show specific message for wishlist actions
      if (added) {
        this.showWishlistSuccessPopup(productTitle);
      } else {
        this.showToast(`"${productTitle}" removed from wishlist`, 'success');
      }
    }
  }

  // Show wishlist success popup with item count
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

    // Create toast element with proper CSS classes
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    
    // Add inline styles to ensure visibility while CSS loads
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
    
    // Use proper HTML structure that matches CSS
    toast.innerHTML = `
      <div class="toast-content wishlist-content" style="background: transparent; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div class="wishlist-icon-large" style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <i class="fas fa-heart" style="color: white; font-size: 1.5rem;"></i>
        </div>
        <div class="wishlist-info" style="flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span class="wishlist-title" style="font-size: 1rem; font-weight: 600; color: white; margin: 0;">Added to Wishlist</span>
          <span class="wishlist-subtitle" style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.9); margin: 0;">"${productTitle}"</span>
          <span class="wishlist-count" style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.8); margin: 0;">1 item saved to your wishlist</span>
          <button class="btn-view-wishlist" style="padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 0.875rem; cursor: pointer; display: flex; align-items: center; gap: 4px; ">
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

    // Show with inline style animation (since CSS might be scoped)
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

  // Navigate to wishlist page
  viewWishlist() {
    this.router.navigate(['/library/wishlist']);
  }

  // Show wishlist counter popup with proper styling
  displayWishlistCounterPopup(message: string) {
    const toast = document.createElement('div');
    toast.className = 'wishlist-popup wishlist-counter-popup';
    
    // Calculate proper positioning
    const navbar = document.querySelector('.navbar');
    const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 70;
    const topPosition = navbarHeight + 20;
    
    // Get container width to match navbar
    const container = document.querySelector('.container');
    const containerRect = container ? container.getBoundingClientRect() : null;
    
    // Initial positioning (for animation)
    toast.style.position = 'fixed';
    toast.style.top = `${topPosition}px`;
    toast.style.zIndex = '1003';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px) scale(0.95)';
    toast.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Set width and position to match navbar container
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      toast.style.left = '20px';
      toast.style.right = '20px';
      toast.style.width = 'auto';
    } else if (containerRect) {
      toast.style.left = `${containerRect.left}px`;
      toast.style.width = `${containerRect.width}px`;
    } else {
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%) translateY(-20px) scale(0.95)';
      toast.style.maxWidth = '1200px';
      toast.style.width = 'calc(100% - 40px)';
    }
    
    toast.innerHTML = `
      <div class="container">
        <div class="toast-content wishlist-counter-content">
          <div class="wishlist-icon-large wishlist-counter-icon">
            <i class="fas fa-heart"></i>
          </div>
          <div class="wishlist-counter-info">
            <span class="wishlist-counter-title">Added to Wishlist</span>
            <span class="wishlist-counter-message">${message} to your wishlist</span>
            <button class="btn-view-wishlist-inline btn-view-wishlist">
              <i class="fas fa-eye"></i>
              View Wishlist
            </button>
          </div>
          <div class="wishlist-actions">
            <button class="btn-close-popup">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
      if (isMobile) {
        toast.style.transform = 'translateY(0) scale(1)';
      } else if (containerRect) {
        toast.style.transform = 'translateY(0) scale(1)';
      } else {
        toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
      }
    }, 50);

    // Auto remove after 4 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        if (isMobile) {
          toast.style.transform = 'translateY(-20px) scale(0.95)';
        } else if (containerRect) {
          toast.style.transform = 'translateY(-20px) scale(0.95)';
        } else {
          toast.style.transform = 'translateX(-50%) translateY(-20px) scale(0.95)';
        }
        setTimeout(() => {
          toast.remove();
        }, 400);
      }
    }, 4000);

    // Add click handlers
    const viewWishlistBtn = toast.querySelector('.btn-view-wishlist');
    const closeBtn = toast.querySelector('.btn-close-popup');
    
    if (viewWishlistBtn) {
      viewWishlistBtn.addEventListener('click', () => {
        this.router.navigate(['/library/wishlist']);
        toast.remove();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toast.style.opacity = '0';
        if (isMobile) {
          toast.style.transform = 'translateY(-20px) scale(0.95)';
        } else if (containerRect) {
          toast.style.transform = 'translateY(-20px) scale(0.95)';
        } else {
          toast.style.transform = 'translateX(-50%) translateY(-20px) scale(0.95)';
        }
        setTimeout(() => {
          toast.remove();
        }, 400);
      });
    }
  }

  // Show toast notification
  showToast(message: string, type: 'success' | 'error' = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Calculate proper top position based on navbar height
    const navbar = document.querySelector('.navbar');
    const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 70;
    const topPosition = navbarHeight + 10; // Add 10px spacing
    
    toast.style.position = 'fixed';
    toast.style.top = `${topPosition}px`;
    toast.style.right = '20px';
    toast.style.zIndex = '1002';
    
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span class="toast-message">${message}</span>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // Handle wishlist button hover
  onWishlistHover(product: Product, isHovered: boolean, event: Event) {
    event.stopPropagation();
    product.wishlistHovered = isHovered;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  // Search functionality
  onSearch() {
    this.applyFilters();
  }

  // Helper method to convert CategoryService ProductListItemDTO to the main ProductListItemDTO
  private convertCategoryProductToMain(product: import('../../core/services/category.service').ProductListItemDTO): ProductListItemDTO {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      coverImageUrl: product.coverImageUrl,
      averageRating: product.averageRating,
      creatorUsername: product.creatorUsername,
      isPublic: product.isPublic,
      category: {
        id: product.category.id,
        name: product.category.name,
        parentCategoryId: product.category.parentCategoryId === null ? undefined : product.category.parentCategoryId
      },
      salesCount: 0, // Default value since not provided by category service
      currency: 'USD', // Default currency
      permalink: `product-${product.id}`, // Generate a default permalink
      status: 'Published', // Default status
      publishedAt: new Date().toISOString() // Default published date
    };
  }

  // Helper method to update products from API response
  private updateProductsFromAPI(products: ProductListItemDTO[]) {
    this.allProducts = products.map(product => ({
      id: product.id,
      title: product.name || 'Untitled Product',
      creator: product.creatorUsername || 'Unknown Creator',
      price: product.price,
      rating: product.averageRating,
      ratingCount: 0, // Will be populated with actual review count
      image: this.ensureFullUrl(product.coverImageUrl),
      category: 'design', // Default category, you might want to add this to the DTO
      tags: ['Design'], // Default tags, you might want to add this to the DTO
      badge: product.isPublic ? 'Public' : 'Private',
      // Initialize wishlist properties
      inWishlist: false,
      loadingWishlist: false,
      wishlistHovered: false,
      // Initialize purchase properties
      isPurchased: false,
      loadingPurchase: false
    }));
    
    this.recommendedProducts = this.allProducts.slice(0, 6);
    this.filteredProducts = [...this.allProducts];
    
    // Load wishlist status for all products
    this.loadWishlistStatus();
    
    // Load actual review counts for all products
    this.loadReviewCounts();
    
    // Load purchase status for all products
    this.loadPurchaseStatus();
  }

  // Category filtering
  onCategorySelected(event: {id: number | 'all', includeNested: boolean, allCategoryIds?: number[]}) {
    console.log('Category selected event received:', event);
    this.selectedCategory = event.id;
    
    if (event.allCategoryIds && event.allCategoryIds.length > 0) {
      // Use hierarchical search with all category IDs
      this.loadProductsByMultipleCategories(event.allCategoryIds);
    } else {
      // Use single category search
      this.loadProductsByCategory(event.id, event.includeNested);
    }
  }

  // New method to load products by multiple categories (for hierarchical search)
  loadProductsByMultipleCategories(categoryIds: number[]) {
    console.log('=== Loading Products by Multiple Categories ===');
    console.log('Category IDs:', categoryIds);
    console.log('API URL will be:', `http://localhost:5255/api/products/by-categories?${categoryIds.map(id => `categoryIds=${id}`).join('&')}`);
    
    this.loading = true;
    
    // Use the new single API endpoint for multiple categories
    this.productService.getProductsByMultipleCategories(categoryIds, 1, 1000).subscribe({
      next: (result) => {
        console.log('✅ Products loaded successfully for multiple categories:', result);
        console.log('Number of products found:', result.items?.length || 0);
        console.log('Products:', result.items);
        
        this.updateProductsFromAPI(result.items || []);
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading products for multiple categories:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
        this.loading = false;
      }
    });
  }

  loadProductsByCategory(categoryId: number | 'all', includeNested: boolean = true) {
    console.log('=== Loading Products by Category ===');
    console.log('Category ID:', categoryId);
    console.log('Include nested:', includeNested);
    console.log('API URL will be:', `http://localhost:5255/api/products${categoryId !== 'all' ? '?categoryId=' + categoryId : ''}`);
    
    this.loading = true;
    
    if (categoryId === 'all') {
      // Load all products using the main products endpoint
      this.productService.getAll(1, 1000).subscribe({
        next: (result) => {
          console.log('✅ All products loaded successfully:', result);
          console.log('Number of products:', result.items?.length || 0);
          this.updateProductsFromAPI(result.items || []);
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error loading all products:', error);
          this.loading = false;
        }
      });
    } else {
      // Use the Products API with categoryId parameter - this calls the backend GetProducts endpoint
      console.log('🔍 Calling ProductService.getProductsByCategory...');
      this.productService.getProductsByCategory(categoryId, 1, 1000).subscribe({
        next: (result) => {
          console.log('✅ Products loaded successfully for category', categoryId, ':', result);
          console.log('Number of products found:', result.items?.length || 0);
          console.log('Products:', result.items);
          this.updateProductsFromAPI(result.items || []);
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error loading products for category', categoryId, ':', error);
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            message: error.message
          });
          this.loading = false;
          
          // Fallback: try the category service approach
          console.log('🔄 Falling back to category service...');
          const categoryCall = includeNested 
            ? this.categoryService.getCategoryProductsIncludeNested(categoryId, 1, 1000)
            : this.categoryService.getCategoryProducts(categoryId, 1, 1000);
          
          categoryCall.subscribe({
            next: (result) => {
              console.log('✅ Fallback: Products loaded for category', categoryId, ':', result);
              console.log('Fallback: Number of products found:', result.items?.length || 0);
              const convertedProducts = result.items.map(item => this.convertCategoryProductToMain(item));
              this.updateProductsFromAPI(convertedProducts);
              this.loading = false;
            },
            error: (fallbackError) => {
              console.error('❌ Fallback error loading products by category:', fallbackError);
              this.loading = false;
            }
          });
        }
      });
    }
  }

  // Legacy method for backward compatibility
  filterByCategory(category: string) {
    // Convert old string-based categories to new number-based system
    const categoryMap: {[key: string]: number} = {
      '3d': 6,
      'design': 15,
      'sound': 7,
      'other': 1 // Default fallback
    };
    
    if (category === 'all') {
      this.onCategorySelected({ id: 'all', includeNested: true });
    } else {
      const categoryId = categoryMap[category] || 1;
      this.onCategorySelected({ id: categoryId, includeNested: true });
    }
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
    let filtered = [...this.allProducts];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(query) ||
        product.creator.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === this.selectedCategory);
    }

    // Price filter
    filtered = filtered.filter(product => product.price <= this.priceRange);

    // Rating filter
    if (this.selectedRating > 0) {
      filtered = filtered.filter(product => product.rating >= this.selectedRating);
    }

    // Tags filter
    if (this.selectedTags.length > 0) {
      filtered = filtered.filter(product => 
        this.selectedTags.some(tag => product.tags.includes(tag))
      );
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
          wishlistHovered: false,
          isPurchased: false,
          loadingPurchase: false
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
          wishlistHovered: false,
          isPurchased: false,
          loadingPurchase: false
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

  // Navigate to library for purchased products
  goToLibrary(product: Product, event: Event) {
    // Prevent event bubbling to avoid triggering product view
    event.stopPropagation();
    this.router.navigate(['/library/purchased-products']);
  }
}
