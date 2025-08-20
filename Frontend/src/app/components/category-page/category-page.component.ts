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
import { HierarchicalCategoryNav } from '../shared/hierarchical-category-nav/hierarchical-category-nav';
import { Navbar } from '../navbar/navbar';
import { Footer } from "../footer/footer";

interface Product {
  id: number;
  title: string;
  creator: string;
  creatorId?: number;
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
  showOnly: string;
}

@Component({
  selector: 'app-category-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HierarchicalCategoryNav, Navbar, Footer],
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
  
  // Separate tracking for filtered results
  filteredTotalProducts: number = 0;
  filteredTotalPages: number = 0;
  
  // Additional tracking for analytics filters
  currentFilterType: string = 'all';
  
  // Filters
  filters: FilterState = {
    priceRange: 1000,
    selectedRating: 0,
    selectedTags: [],
    searchQuery: '',
    showOnly: 'all'
  };
  
  // Available filters
  availableTags: string[] = [];

  showOnlyOptions = [
    { value: 'all', label: 'All Products', icon: 'fas fa-box' },
    { value: 'top-rated', label: 'Top Rated (4+ ⭐)', icon: 'fas fa-star' },
    { value: 'most-wished', label: 'Most Wished', icon: 'fas fa-heart' },
    { value: 'best-selling', label: 'Best Selling', icon: 'fas fa-trophy' },
    { value: 'new-arrivals', label: 'New Arrivals', icon: 'fas fa-clock' },
    { value: 'trending', label: 'Trending', icon: 'fas fa-fire' }
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
      this.filters.showOnly = queryParams['showOnly'] || 'all';
      this.currentPage = parseInt(queryParams['page']) || 1;
      this.filters.priceRange = parseInt(queryParams['price']) || 1000;
      this.filters.selectedRating = parseInt(queryParams['rating']) || 0;
      this.filters.searchQuery = queryParams['search'] || '';
      
      // Only restore tags if we're on the same category (not switching categories)
      if (queryParams['tags'] && this.currentCategory) {
        this.filters.selectedTags = queryParams['tags'].split(',').filter((tag: string) => tag.trim());
      } else {
        // Clear tags when switching categories
        this.filters.selectedTags = [];
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
      // Clear filters when switching categories (except showOnly)
      this.filters.selectedTags = [];
      this.filters.searchQuery = '';
      this.filters.selectedRating = 0;
      this.filters.priceRange = 1000;
      this.currentPage = 1;
      
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
    try {
      // First try to get the category hierarchy from API
      const hierarchy = await this.categoryService.getCategoriesHierarchy().toPromise();
      if (hierarchy) {
        const category = this.findCategoryBySlug(hierarchy, slug);
        if (category) {
          return category;
        }
      }
    } catch (error) {
      console.error('Error fetching category hierarchy:', error);
    }

    // Fallback to static mapping for main categories
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
          'ebooks': { id: 14, name: 'eBooks' },
      // Note: Audio and Recorded Music categories have been consolidated into Music & Sound Design
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

  // Helper method to find category by slug in hierarchy
  private findCategoryBySlug(categories: CategoryDTO[], slug: string): CategoryDTO | null {
    for (const category of categories) {
      if (this.generateSlug(category.name) === slug) {
        return category;
      }
      if (category.subcategories && category.subcategories.length > 0) {
        const found = this.findCategoryBySlug(category.subcategories, slug);
        if (found) return found;
      }
    }
    return null;
  }

  // Helper method to generate slug from category name
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  private async loadAvailableTags() {
    try {
      // Generate tags from sub-categories only (not main categories or sub-sub-categories)
      this.availableTags = this.getSubCategoryTags();
      console.log('Available tags (sub-categories only):', this.availableTags);
    } catch (error) {
      console.error('Error loading available tags:', error);
      // Fallback to default tags based on category
      this.availableTags = this.getDefaultTagsForCategory();
    }
  }

  // Generate tags from sub-categories only
  private getSubCategoryTags(): string[] {
    const tags: string[] = [];
    
    if (!this.currentCategory || !this.currentCategory.subcategories) {
      return tags;
    }
    
    // Add the current category as a tag (for filtering products in this category)
    tags.push(this.currentCategory.name);
    
    // Add only direct sub-categories (not sub-sub-categories)
    for (const subcategory of this.currentCategory.subcategories) {
      tags.push(subcategory.name);
    }
    
    // Add meaningful attribute tags with clear definitions
    tags.push(
      'Free',           // Products priced at $0
      'Budget',         // Products priced < $10
      'Premium',        // Products priced > $50
      'Top Rated',      // Products with rating >= 4.5
      'Highly Rated',   // Products with rating >= 4.0
      'Popular',        // Products with sales > 100
      'Trending'        // Products with sales > 10
    );
    
    return tags;
  }

  private getDefaultTagsForCategory(): string[] {
    // Return default tags based on the current category
    const categoryName = this.currentCategory?.name?.toLowerCase() || '';
    
    if (categoryName.includes('fitness') || categoryName.includes('health')) {
      return ['Fitness', 'Health', 'Workout', 'Nutrition', 'Wellness', 'Exercise', 'Training', 'Free', 'Premium', 'Popular'];
    } else if (categoryName.includes('design')) {
      return ['Design', 'Graphics', 'Templates', 'Icons', 'Fonts', 'UI/UX', 'Free', 'Premium', 'Popular'];
    } else if (categoryName.includes('3d')) {
      return ['3D', 'Models', 'Rendering', 'Animation', 'Free', 'Premium', 'Popular'];
    } else if (categoryName.includes('music') || categoryName.includes('audio')) {
      return ['Music', 'Audio', 'Sound', 'Tracks', 'Free', 'Premium', 'Popular'];
    } else if (categoryName.includes('software') || categoryName.includes('development')) {
      return ['Code', 'Software', 'Development', 'Templates', 'Free', 'Premium', 'Popular'];
    } else {
      return ['Free', 'Premium', 'Popular', 'Trending', 'Top Rated', 'New', 'Budget'];
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
        // Apply client-side filters after loading products
        this.applyFilters();
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
    try {
      switch (this.filters.showOnly) {
        case 'top-rated':
          // Get all top-rated products first, then filter by category, then paginate
          const allTopRated = await this.analyticsService.getTopRatedProducts(1000).toPromise();
          if (allTopRated) {
            // Filter by current category
            const categoryFilteredTopRated = allTopRated.filter((product: any) => 
              product.category && this.allCategoryIds.includes(product.category.id)
            );
            // Apply pagination
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const paginatedTopRated = categoryFilteredTopRated.slice(startIndex, endIndex);
            return { 
              items: paginatedTopRated, 
              totalCount: categoryFilteredTopRated.length, 
              totalPages: Math.ceil(categoryFilteredTopRated.length / this.pageSize),
              filterType: 'top-rated'
            };
          }
          break;
        case 'most-wished':
          // Get all most-wished products first, then filter by category, then paginate
          const allMostWished = await this.analyticsService.getMostWishedProducts(1000).toPromise();
          if (allMostWished) {
            // Filter by current category
            const categoryFilteredMostWished = allMostWished.filter((product: any) => 
              product.category && this.allCategoryIds.includes(product.category.id)
            );
            // Apply pagination
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const paginatedMostWished = categoryFilteredMostWished.slice(startIndex, endIndex);
            return { 
              items: paginatedMostWished, 
              totalCount: categoryFilteredMostWished.length, 
              totalPages: Math.ceil(categoryFilteredMostWished.length / this.pageSize),
              filterType: 'most-wished'
            };
          }
          break;
        case 'best-selling':
          // Get all best-selling products first, then filter by category, then paginate
          const allBestSelling = await this.analyticsService.getBestSellerProducts(1000).toPromise();
          if (allBestSelling) {
            // Filter by current category
            const categoryFilteredBestSelling = allBestSelling.filter((product: any) => 
              product.category && this.allCategoryIds.includes(product.category.id)
            );
            // Apply pagination
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const paginatedBestSelling = categoryFilteredBestSelling.slice(startIndex, endIndex);
            return { 
              items: paginatedBestSelling, 
              totalCount: categoryFilteredBestSelling.length, 
              totalPages: Math.ceil(categoryFilteredBestSelling.length / this.pageSize),
              filterType: 'best-selling'
            };
          }
          break;
        case 'new-arrivals':
          // Get all new arrivals first, then filter by category, then paginate
          const allNewArrivals = await this.analyticsService.getNewArrivals(1000).toPromise();
          if (allNewArrivals) {
            // Filter by current category
            const categoryFilteredNewArrivals = allNewArrivals.filter((product: any) => 
              product.category && this.allCategoryIds.includes(product.category.id)
            );
            // Apply pagination
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const paginatedNewArrivals = categoryFilteredNewArrivals.slice(startIndex, endIndex);
            return { 
              items: paginatedNewArrivals, 
              totalCount: categoryFilteredNewArrivals.length, 
              totalPages: Math.ceil(categoryFilteredNewArrivals.length / this.pageSize)
            };
          }
          break;
        case 'trending':
          // Get all trending products first, then filter by category, then paginate
          const allTrending = await this.analyticsService.getTrendingProducts(1000).toPromise();
          if (allTrending) {
            // Filter by current category
            const categoryFilteredTrending = allTrending.filter((product: any) => 
              product.category && this.allCategoryIds.includes(product.category.id)
            );
            // Apply pagination
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const paginatedTrending = categoryFilteredTrending.slice(startIndex, endIndex);
            return { 
              items: paginatedTrending, 
              totalCount: categoryFilteredTrending.length, 
              totalPages: Math.ceil(categoryFilteredTrending.length / this.pageSize)
            };
          }
          break;
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
    
    // If we reach here, return empty result
    return { 
      items: [], 
      totalCount: 0, 
      totalPages: 1
    };
  }

  private updateProductsFromResult(result: any) {
    const products = result.items || [];
    
    // Store additional info for display
    this.totalProducts = result.totalCount || 0;
    this.totalPages = result.totalPages || 1;
    this.currentFilterType = result.filterType || 'all';
    
    this.allProducts = products.map((product: ProductListItemDTO) => ({
      id: product.id,
      title: product.name || 'Untitled Product',
      creator: product.creatorUsername || 'Unknown Creator',
      creatorId: product.creatorId,
      price: product.price,
      rating: product.averageRating || 0,
      ratingCount: 0,
      image: this.ensureFullUrl(product.coverImageUrl),
      category: product.category?.name || 'Unknown',
      tags: this.getTagsForProduct(product), // Generate tags based on product data
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

    // Set pagination data from backend response
    this.totalProducts = result.totalCount || 0;
    this.totalPages = result.totalPages || 1;
    
    // Ensure we have at least 1 page
    if (this.totalPages < 1) {
      this.totalPages = 1;
    }
    
    console.log('Backend pagination data:', {
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      pageNumber: result.pageNumber,
      pageSize: result.pageSize,
      itemsCount: products.length
    });
    
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
          showOnly: this.filters.showOnly,
          page: 1
        }
      });
    }
  }

  private getCategorySlugById(categoryId: number): string | null {
    // Try to find the category in the hierarchy first
    const category = this.findCategoryByIdInHierarchy(categoryId);
    if (category) {
      return this.generateSlug(category.name);
    }
    
    // Fallback to static mapping for main categories
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
              14: 'ebooks'
    };
    
    return slugMap[categoryId] || null;
  }

  // Helper method to find category by ID in hierarchy
  private findCategoryByIdInHierarchy(categoryId: number): CategoryDTO | null {
    // This would need to be populated with the current hierarchy
    // For now, we'll use the static mapping
    return null;
  }

  // Filtering and sorting
  applyFilters() {
    let filtered = [...this.allProducts];
    const initialCount = filtered.length;

    // Search filter
    if (this.filters.searchQuery.trim()) {
      const query = this.filters.searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(query) ||
        product.creator.toLowerCase().includes(query) ||
        (product.tags && product.tags.some(tag => tag.toLowerCase().includes(query)))
      );
      console.log(`Search filter: ${initialCount} → ${filtered.length} products`);
    }

    // Price filter
    const beforePrice = filtered.length;
    filtered = filtered.filter(product => product.price <= this.filters.priceRange);
    if (beforePrice !== filtered.length) {
      console.log(`Price filter (≤$${this.filters.priceRange}): ${beforePrice} → ${filtered.length} products`);
    }

    // Rating filter
    if (this.filters.selectedRating > 0) {
      const beforeRating = filtered.length;
      
      // Debug: Log rating distribution before filtering
      const ratingDistribution = this.getRatingDistribution(filtered);
      console.log('Rating distribution before filter:', ratingDistribution);
      
      if (this.filters.selectedRating === 5) {
        // For 5+, show only 5-star products (since there's nothing above 5)
        filtered = filtered.filter(product => product.rating === 5);
        console.log(`Rating filter (5⭐): ${beforeRating} → ${filtered.length} products`);
      } else {
        // For 1+, 2+, 3+, 4+, show products with rating >= selected
        filtered = filtered.filter(product => product.rating >= this.filters.selectedRating);
        console.log(`Rating filter (≥${this.filters.selectedRating}⭐): ${beforeRating} → ${filtered.length} products`);
        
        // Sort by rating in ascending order (lowest rating first)
        filtered = filtered.sort((a, b) => a.rating - b.rating);
        console.log(`Products sorted by rating (ascending)`);
      }
    }

    // Tags filter
    if (this.filters.selectedTags.length > 0) {
      const beforeTags = filtered.length;
      filtered = filtered.filter(product => 
        product.tags && this.filters.selectedTags.some(tag => 
          product.tags.some(productTag => 
            productTag.toLowerCase() === tag.toLowerCase()
          )
        )
      );
      console.log(`Tags filter (${this.filters.selectedTags.join(', ')}): ${beforeTags} → ${filtered.length} products`);
    }



    this.filteredProducts = filtered;
    
    // Handle pagination differently based on filter type
    if (this.filters.showOnly !== 'all' && !this.hasClientSideFilters()) {
      // For special filters (Top Rated, Most Wished, etc.) with no client-side filters, use backend pagination
      this.filteredTotalProducts = this.totalProducts;
      this.filteredTotalPages = this.totalPages;
    } else {
      // For client-side filters (search, price, rating, tags), use client-side pagination
      this.filteredTotalProducts = filtered.length;
      this.filteredTotalPages = Math.ceil(this.filteredTotalProducts / this.pageSize);
      
      // Ensure current page is valid for filtered results
      if (this.currentPage > this.filteredTotalPages && this.filteredTotalPages > 0) {
        this.currentPage = this.filteredTotalPages;
      }
    }

    console.log(`Final filtered results: ${this.filteredProducts.length} products, ${this.filteredTotalPages} pages`);
    console.log(`Backend total: ${this.totalProducts} products, ${this.totalPages} pages`);
  }



  // Event handlers
  onSearch() {
    this.currentPage = 1;
    this.updateQueryParams();
    this.applyFilters();
  }



  onShowOnlyChange(value: string) {
    this.filters.showOnly = value;
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
      queryParamsHandling: 'replace' // Changed from 'merge' to 'replace'
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
    console.log('Clear All Filters clicked - before clearing:', this.filters);
    
    this.filters = {
      priceRange: 1000,
      selectedRating: 0,
      selectedTags: [],
      searchQuery: '',
      showOnly: 'all'
    };
    this.currentPage = 1;
    
    console.log('Clear All Filters - after clearing:', this.filters);
    console.log('hasActiveFilters():', this.hasActiveFilters());
    
    this.updateQueryParams();
    // Apply filters directly instead of reloading products
    this.applyFilters();
  }

  // Get products count for current filters
  getFilteredProductsCount(): number {
    return this.filteredProducts.length;
  }

  // Check if any client-side filters are active (excluding showOnly)
  hasClientSideFilters(): boolean {
    return this.filters.searchQuery.trim() !== '' ||
           this.filters.selectedRating > 0 ||
           this.filters.selectedTags.length > 0 ||
           this.filters.priceRange < 1000;
  }

  // Get rating distribution for debugging
  private getRatingDistribution(products: Product[]): { [key: number]: number } {
    const distribution: { [key: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = products.filter(p => p.rating === i).length;
    }
    return distribution;
  }

  // Check if any filters are active
  hasActiveFilters(): boolean {
    const hasActive = this.filters.searchQuery.trim() !== '' ||
           this.filters.selectedRating > 0 ||
           this.filters.selectedTags.length > 0 ||
           this.filters.priceRange < 1000 ||
           this.filters.showOnly !== 'all';
    
    console.log('hasActiveFilters() called:', {
      searchQuery: this.filters.searchQuery,
      selectedRating: this.filters.selectedRating,
      selectedTags: this.filters.selectedTags,
      priceRange: this.filters.priceRange,
      showOnly: this.filters.showOnly,
      result: hasActive
    });
    
    return hasActive;
  }

  // Get visible page numbers for pagination
  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const totalPages = this.hasActiveFilters() ? this.filteredTotalPages : this.totalPages;
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

  // Generate tags for a product based on its data
  private getTagsForProduct(product: ProductListItemDTO): string[] {
    const tags: string[] = [];
    
    // Add category-based tags (handle null category)
    if (product.category) {
      tags.push(product.category.name);
    } else {
      // Only use current category as fallback if product has no category
      if (this.currentCategory) {
        tags.push(this.currentCategory.name);
      }
    }
    
    // Add price-based tags
    if (product.price === 0) {
      tags.push('Free');
    } else if (product.price < 10) {
      tags.push('Budget');
    } else if (product.price > 50) {
      tags.push('Premium');
    }
    
    // Add rating-based tags
    if (product.averageRating >= 4.5) {
      tags.push('Top Rated');
    } else if (product.averageRating >= 4.0) {
      tags.push('Highly Rated');
    }
    
    // Add sales-based tags
    if (product.salesCount > 100) {
      tags.push('Popular');
    } else if (product.salesCount > 10) {
      tags.push('Trending');
    }
    
    // Add status-based tags
    if (product.isPublic) {
      tags.push('Public');
    } else {
      tags.push('Private');
    }
    
    // Filter tags to only include those that are available in the current context
    const availableTagsSet = new Set(this.availableTags);
    const filteredTags = tags.filter(tag => availableTagsSet.has(tag));
    
    console.log(`Generated tags for "${product.name}": [${filteredTags.join(', ')}]`);
    return filteredTags;
  }

  // Handle page click
  onPageClick(page: number | string): void {
    if (typeof page === 'number') {
      this.onPageChange(page);
    }
  }

  // Navigate to creator profile
  viewCreatorProfile(creatorId?: number, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent triggering the product card click
    }
    if (creatorId) {
      this.router.navigate(['/creator', creatorId]);
    }
  }
}
