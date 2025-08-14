import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProductService } from '../../core/services/product.service';
import { CategoryService, CategoryDTO } from '../../core/services/category.service';
import { TagService } from '../../core/services/tag.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ProductListItemDTO } from '../../core/models/product/product-list-item.dto';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { Navbar } from '../navbar/navbar';
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
  inWishlist: boolean;
  loadingWishlist: boolean;
  wishlistHovered: boolean;
  isPurchased: boolean;
  loadingPurchase: boolean;
  salesCount?: number;
  viewsCount?: number;
  wishlistCount?: number;
}

interface FilterState {
  priceRange: number;
  selectedRating: number;
  selectedTags: string[];
  searchQuery: string;
  sortBy: string;
  showOnly: string;
}

@Component({
  selector: 'app-category-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Navbar, HierarchicalCategoryNav],
  templateUrl: './category-page.component.html',
  styleUrl: './category-page.component.css'
})
export class CategoryPageComponent implements OnInit, OnDestroy {
  @ViewChild('productsContainer') productsContainer!: ElementRef;

  // Route parameters
  categorySlug: string = '';
  
  // Category data
  currentCategory: CategoryDTO | null = null;
  categoryName: string = '';
  allCategoryIds: number[] = [];
  
  // Product data
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  loading: boolean = false;
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 12; // Reduced from 24 to 12 for better UX
  totalPages: number = 0;
  totalProducts: number = 0;
  
  // Filters
  filters: FilterState = {
    priceRange: 1000,
    selectedRating: 0,
    selectedTags: [],
    searchQuery: '',
    sortBy: 'curated',
    showOnly: 'all'
  };
  
  // Available filters
  availableTags: string[] = [];
  sortOptions = [
    { value: 'curated', label: 'Curated', icon: '🎯' },
    { value: 'newest', label: 'Newest', icon: '🆕' },
    { value: 'price-low', label: 'Price: Low to High', icon: '💰' },
    { value: 'price-high', label: 'Price: High to Low', icon: '💎' },
    { value: 'rating', label: 'Highest Rated', icon: '⭐' },
    { value: 'popular', label: 'Most Popular', icon: '🔥' },
    { value: 'most-wished', label: 'Most Wished', icon: '❤️' },
    { value: 'best-selling', label: 'Best Selling', icon: '🏆' }
  ];

  showOnlyOptions = [
    { value: 'all', label: 'All Products', icon: '📦' },
    { value: 'top-rated', label: 'Top Rated (4+ ⭐)', icon: '⭐' },
    { value: 'most-wished', label: 'Most Wished', icon: '❤️' },
    { value: 'best-selling', label: 'Best Selling', icon: '🏆' },
    { value: 'new-arrivals', label: 'New Arrivals', icon: '🆕' },
    { value: 'trending', label: 'Trending', icon: '📈' }
  ];

  private routeSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    private tagService: TagService,
    private analyticsService: AnalyticsService,
    private authService: AuthService,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.routeSubscription = this.route.params.subscribe(params => {
      this.categorySlug = params['categorySlug'];
      this.initializePage();
    });

    // Listen for query parameters
    this.route.queryParams.subscribe(queryParams => {
      this.filters.sortBy = queryParams['sort'] || 'curated';
      this.filters.showOnly = queryParams['showOnly'] || 'all';
      this.currentPage = parseInt(queryParams['page']) || 1;
      this.filters.priceRange = parseInt(queryParams['price']) || 1000;
      this.filters.selectedRating = parseInt(queryParams['rating']) || 0;
      this.filters.searchQuery = queryParams['search'] || '';
      
      if (queryParams['tags']) {
        this.filters.selectedTags = queryParams['tags'].split(',').filter((tag: string) => tag.trim());
      }
      
      if (this.currentCategory) {
        this.loadCategoryProducts();
      }
    });
  }

  ngOnDestroy() {
    this.routeSubscription.unsubscribe();
  }

  async initializePage() {
    this.loading = true;
    
    try {
      // Get category by slug
      this.currentCategory = await this.getCategoryBySlug(this.categorySlug);
      if (this.currentCategory) {
        this.categoryName = this.currentCategory.name;
        document.title = `${this.categoryName} - Raqmiya`;
        
        // Get all subcategory IDs for hierarchical search
        this.allCategoryIds = await this.getAllCategoryIds(this.currentCategory);
        
        // Load available tags for this category
        await this.loadAvailableTags();
        
        // Load products
        await this.loadCategoryProducts();
      } else {
        // Redirect to 404 if category not found
        this.router.navigate(['/not-found']);
      }
    } catch (error) {
      console.error('Error initializing category page:', error);
      this.router.navigate(['/not-found']);
    } finally {
      this.loading = false;
    }
  }

  private async getCategoryBySlug(slug: string): Promise<CategoryDTO | null> {
    // Map of category slugs to category data
    const categorySlugMap: { [key: string]: { id: number, name: string } } = {
      'fitness-health': { id: 1, name: 'Fitness & Health' },
      'self-improvement': { id: 2, name: 'Self Improvement' },
      'writings-publishing': { id: 3, name: 'Writings & Publishing' },
      'education': { id: 4, name: 'Education' },
      'business-money': { id: 5, name: 'Business & Money' },
      'drawing-painting': { id: 6, name: 'Drawing & Painting' },
      'design': { id: 7, name: 'Design' },
      '3d': { id: 8, name: '3D' },
      'music-sound-design': { id: 9, name: 'Music & Sound Design' },
      'films': { id: 10, name: 'Films' },
      'software-development': { id: 11, name: 'Software Development' },
      'gaming': { id: 12, name: 'Gaming' },
      'photography': { id: 13, name: 'Photography' },
      'comics-graphic-novels': { id: 14, name: 'Comics & Graphic Novels' },
      'fiction-books': { id: 15, name: 'Fiction Books' },
      'audio': { id: 16, name: 'Audio' },
      'recorded-music': { id: 17, name: 'Recorded Music' }
    };

    const categoryInfo = categorySlugMap[slug];
    if (categoryInfo) {
      try {
        const result = await this.categoryService.getCategoryById(categoryInfo.id).toPromise();
        return result || null;
      } catch (error) {
        console.error('Error fetching category by ID:', error);
        // Return a basic category object if API fails
        return {
          id: categoryInfo.id,
          name: categoryInfo.name,
          description: `Explore ${categoryInfo.name} products`
        };
      }
    }
    return null;
  }

  private async loadAvailableTags() {
    try {
      // Get tags for the current category and its subcategories
      const tags = await this.tagService.getTagsForCategories(this.allCategoryIds).toPromise();
      if (tags) {
        this.availableTags = tags.map((tag: any) => tag.name);
      }
    } catch (error) {
      console.error('Error loading available tags:', error);
      // Fallback to default tags
      this.availableTags = ['3D', 'Design', 'Audio', 'Templates', 'Icons', 'Fonts', 'Graphics', 'Code', 'Premium', 'Free'];
    }
  }

  private async getAllCategoryIds(category: CategoryDTO): Promise<number[]> {
    let ids = [category.id];
    
    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        ids = ids.concat(await this.getAllCategoryIds(subcategory));
      }
    }
    
    return ids;
  }

  private async loadCategoryProducts() {
    if (!this.currentCategory) return;

    this.loading = true;
    
    try {
      let result;
      
      // Apply special filters first
      if (this.filters.showOnly !== 'all') {
        result = await this.loadSpecialFilteredProducts();
      } else {
        // Use multiple categories endpoint for hierarchical search
        result = await this.productService.getProductsByMultipleCategories(
          this.allCategoryIds, 
          this.currentPage, 
          this.pageSize
        ).toPromise();
      }
      
      if (result) {
        this.updateProductsFromResult(result);
      }
    } catch (error) {
      console.error('Error loading category products:', error);
      this.allProducts = [];
      this.filteredProducts = [];
    } finally {
      this.loading = false;
    }
  }

  private async loadSpecialFilteredProducts(): Promise<any> {
    const count = this.pageSize;
    
    try {
      switch (this.filters.showOnly) {
        case 'top-rated':
          const topRated = await this.analyticsService.getTopRatedProducts(count).toPromise();
          return { items: topRated, totalCount: topRated?.length || 0, totalPages: 1 };
        case 'most-wished':
          const mostWished = await this.analyticsService.getMostWishedProducts(count).toPromise();
          return { items: mostWished, totalCount: mostWished?.length || 0, totalPages: 1 };
        case 'best-selling':
          const bestSelling = await this.analyticsService.getBestSellerProducts(count).toPromise();
          return { items: bestSelling, totalCount: bestSelling?.length || 0, totalPages: 1 };
        case 'new-arrivals':
          const newArrivals = await this.analyticsService.getNewArrivals(count).toPromise();
          return { items: newArrivals, totalCount: newArrivals?.length || 0, totalPages: 1 };
        case 'trending':
          const trending = await this.analyticsService.getTrendingProducts(count).toPromise();
          return { items: trending, totalCount: trending?.length || 0, totalPages: 1 };
        default:
          return await this.productService.getProductsByMultipleCategories(
            this.allCategoryIds, 
            this.currentPage, 
            this.pageSize
          ).toPromise();
      }
    } catch (error) {
      console.error('Error loading special filtered products:', error);
      // Fallback to regular category products
      return await this.productService.getProductsByMultipleCategories(
        this.allCategoryIds, 
        this.currentPage, 
        this.pageSize
      ).toPromise();
    }
  }

  private updateProductsFromResult(result: any) {
    const products = result.items || [];
    
    this.allProducts = products.map((product: ProductListItemDTO) => ({
      id: product.id,
      title: product.name || 'Untitled Product',
      creator: product.creatorUsername || 'Unknown Creator',
      price: product.price,
      rating: product.averageRating || 0,
      ratingCount: 0,
      image: this.ensureFullUrl(product.coverImageUrl),
      category: 'product',
      tags: ['Product'], // ProductListItemDTO doesn't have tags, so we'll use a default
      badge: product.isPublic ? 'Public' : 'Private',
      inWishlist: false,
      loadingWishlist: false,
      wishlistHovered: false,
      isPurchased: false,
      loadingPurchase: false,
      salesCount: product.salesCount || 0,
      viewsCount: 0, // Not available in ProductListItemDTO
      wishlistCount: 0 // Not available in ProductListItemDTO
    }));

    this.totalProducts = result.totalCount || this.allProducts.length;
    this.totalPages = result.totalPages || 1;
    
    this.applyFilters();
    this.loadWishlistStatus();
    this.loadPurchaseStatus();
  }

  private ensureFullUrl(url: string | null | undefined): string {
    if (!url) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop';
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('/')) {
      return `http://localhost:5255${url}`;
    }
    
    return url;
  }

  // Category selection from hierarchical nav
  onCategorySelected(event: {id: number | 'all', includeNested: boolean, allCategoryIds?: number[]}) {
    if (event.id === 'all') {
      this.router.navigate(['/discover']);
      return;
    }

    // Navigate to the selected category page
    const categorySlug = this.getCategorySlugById(event.id as number);
    if (categorySlug) {
      this.router.navigate(['/category', categorySlug], { 
        queryParams: { 
          sort: this.filters.sortBy,
          showOnly: this.filters.showOnly,
          page: 1
        }
      });
    }
  }

  private getCategorySlugById(categoryId: number): string | null {
    const slugMap: { [key: number]: string } = {
      1: 'fitness-health',
      2: 'self-improvement',
      3: 'writings-publishing',
      4: 'education',
      5: 'business-money',
      6: 'drawing-painting',
      7: 'design',
      8: '3d',
      9: 'music-sound-design',
      10: 'films',
      11: 'software-development',
      12: 'gaming',
      13: 'photography',
      14: 'comics-graphic-novels',
      15: 'fiction-books', 
      16: 'audio',
      17: 'recorded-music'
    };
    
    return slugMap[categoryId] || null;
  }

  // Filtering and sorting
  applyFilters() {
    let filtered = [...this.allProducts];

    // Search filter
    if (this.filters.searchQuery.trim()) {
      const query = this.filters.searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(query) ||
        product.creator.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Price filter
    filtered = filtered.filter(product => product.price <= this.filters.priceRange);

    // Rating filter
    if (this.filters.selectedRating > 0) {
      filtered = filtered.filter(product => product.rating >= this.filters.selectedRating);
    }

    // Tags filter
    if (this.filters.selectedTags.length > 0) {
      filtered = filtered.filter(product => 
        this.filters.selectedTags.some(tag => product.tags.includes(tag))
      );
    }

    // Sort
    this.sortProducts(filtered);

    this.filteredProducts = filtered;
  }

  private sortProducts(products: Product[]) {
    switch (this.filters.sortBy) {
      case 'newest':
        products.sort((a, b) => b.id - a.id);
        break;
      case 'price-low':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        products.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        products.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
        break;
      case 'most-wished':
        products.sort((a, b) => (b.wishlistCount || 0) - (a.wishlistCount || 0));
        break;
      case 'best-selling':
        products.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
        break;
      default:
        // Curated - keep original order
        break;
    }
  }

  // Event handlers
  onSearch() {
    this.currentPage = 1;
    this.updateQueryParams();
    this.applyFilters();
  }

  onSortChange() {
    this.currentPage = 1;
    this.updateQueryParams();
    this.loadCategoryProducts();
  }

  onShowOnlyChange() {
    this.currentPage = 1;
    this.updateQueryParams();
    this.loadCategoryProducts();
  }

  onPriceRangeChange() {
    this.currentPage = 1;
    this.updateQueryParams();
    this.applyFilters();
  }

  filterByRating(rating: number) {
    this.filters.selectedRating = rating;
    this.currentPage = 1;
    this.updateQueryParams();
    this.applyFilters();
  }

  toggleTag(tag: string) {
    const index = this.filters.selectedTags.indexOf(tag);
    if (index > -1) {
      this.filters.selectedTags.splice(index, 1);
    } else {
      this.filters.selectedTags.push(tag);
    }
    this.currentPage = 1;
    this.updateQueryParams();
    this.applyFilters();
  }

  private updateQueryParams() {
    const queryParams: any = {
      sort: this.filters.sortBy,
      showOnly: this.filters.showOnly,
      page: this.currentPage,
      price: this.filters.priceRange,
      rating: this.filters.selectedRating,
      search: this.filters.searchQuery
    };

    if (this.filters.selectedTags.length > 0) {
      queryParams.tags = this.filters.selectedTags.join(',');
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  // Pagination
  onPageChange(page: number) {
    this.currentPage = page;
    this.updateQueryParams();
    this.loadCategoryProducts();
  }

  // Product interactions
  viewProduct(productId: number) {
    this.router.navigate(['/discover', productId]);
  }

  toggleWishlist(product: Product, event: Event) {
    event.stopPropagation();
    
    if (product.loadingWishlist) return;

    product.loadingWishlist = true;

    const apiCall = product.inWishlist 
      ? this.productService.removeFromWishlist(product.id)
      : this.productService.addToWishlist(product.id);

    apiCall.subscribe({
      next: () => {
        product.inWishlist = !product.inWishlist;
        product.loadingWishlist = false;
      },
      error: (error) => {
        product.loadingWishlist = false;
        console.error('Wishlist error:', error);
      }
    });
  }

  onWishlistHover(product: Product, isHovered: boolean, event: Event) {
    event.stopPropagation();
    product.wishlistHovered = isHovered;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  goToLibrary(product: Product, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/library/purchased-products']);
  }

  // Load additional data
  private loadWishlistStatus() {
    if (!this.authService.isLoggedIn()) return;

    this.productService.getWishlist().subscribe({
      next: (wishlistProducts) => {
        const wishlistIds = wishlistProducts.map(p => p.id);
        this.allProducts.forEach(product => {
          product.inWishlist = wishlistIds.includes(product.id);
        });
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading wishlist status:', error);
      }
    });
  }

  private loadPurchaseStatus() {
    if (!this.authService.isLoggedIn()) return;

    this.orderService.getPurchasedProducts().subscribe({
      next: (purchasedProducts) => {
        const purchasedProductIds = purchasedProducts.map(p => p.productId);
        this.allProducts.forEach(product => {
          product.isPurchased = purchasedProductIds.includes(product.id);
        });
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading purchase status:', error);
      }
    });
  }

  // Clear all filters
  clearAllFilters() {
    this.filters = {
      priceRange: 1000,
      selectedRating: 0,
      selectedTags: [],
      searchQuery: '',
      sortBy: 'curated',
      showOnly: 'all'
    };
    this.currentPage = 1;
    this.updateQueryParams();
    this.loadCategoryProducts();
  }

  // Get products count for current filters
  getFilteredProductsCount(): number {
    return this.filteredProducts.length;
  }

  // Check if any filters are active
  hasActiveFilters(): boolean {
    return this.filters.searchQuery.trim() !== '' ||
           this.filters.selectedRating > 0 ||
           this.filters.selectedTags.length > 0 ||
           this.filters.priceRange < 1000 ||
           this.filters.showOnly !== 'all';
  }

  // Get visible page numbers for pagination
  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    
    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 4) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 3) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  }

  // Get show only label
  getShowOnlyLabel(value: string): string {
    const option = this.showOnlyOptions.find(o => o.value === value);
    return option ? option.label : 'Unknown';
  }

  // Handle page click
  onPageClick(page: number | string): void {
    if (typeof page === 'number') {
      this.onPageChange(page);
    }
  }
}
