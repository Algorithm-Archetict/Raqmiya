import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProductService } from '../../core/services/product.service';
import { CategoryService, CategoryDTO } from '../../core/services/category.service';
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
  sortBy: string = 'curated';
  
  // Category data
  currentCategory: CategoryDTO | null = null;
  categoryName: string = '';
  
  // Product data
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  loading: boolean = false;
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 24;
  totalPages: number = 0;
  totalProducts: number = 0;
  
  // Filters
  priceRange: number = 1000;
  selectedRating: number = 0;
  selectedTags: string[] = [];
  searchQuery: string = '';
  
  // Available filters
  availableTags: string[] = ['3D', 'Design', 'Audio', 'Templates', 'Icons', 'Fonts', 'Graphics', 'Code'];
  sortOptions = [
    { value: 'curated', label: 'Curated' },
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'popular', label: 'Most Popular' }
  ];

  private routeSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
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
      this.sortBy = queryParams['sort'] || 'curated';
      this.currentPage = parseInt(queryParams['page']) || 1;
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
      'writings-publishing-education': { id: 3, name: 'Writings & Publishing & Education' },
      'business-money': { id: 4, name: 'Business & Money' },
      'drawing-painting': { id: 5, name: 'Drawing & Painting' },
      '3d': { id: 6, name: '3D' },
      'music-sound-design': { id: 7, name: 'Music & Sound Design' },
      'films': { id: 8, name: 'Films' },
      'software-development': { id: 9, name: 'Software Development' },
      'gaming': { id: 10, name: 'Gaming' },
      'photography': { id: 11, name: 'Photography' },
      'comics-graphic-novels': { id: 12, name: 'Comics & Graphic Novels' },
      'fiction-books': { id: 13, name: 'Fiction Books' },
      'education': { id: 14, name: 'Education' },
      'design': { id: 15, name: 'Design' },
      'audio': { id: 110, name: 'Audio' },
      'recorded-music': { id: 111, name: 'Recorded Music' }
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

  private async loadCategoryProducts() {
    if (!this.currentCategory) return;

    this.loading = true;
    
    try {
      // Get all subcategory IDs for hierarchical search
      const categoryIds = await this.getAllCategoryIds(this.currentCategory);
      
      if (categoryIds.length > 1) {
        // Use multiple categories endpoint for hierarchical search
        const result = await this.productService.getProductsByMultipleCategories(
          categoryIds, 
          this.currentPage, 
          this.pageSize
        ).toPromise();
        
        if (result) {
          this.updateProductsFromResult(result);
        }
      } else {
        // Use single category endpoint
        const result = await this.productService.getProductsByCategory(
          this.currentCategory.id, 
          this.currentPage, 
          this.pageSize
        ).toPromise();
        
        if (result) {
          this.updateProductsFromResult(result);
        }
      }
    } catch (error) {
      console.error('Error loading category products:', error);
      this.allProducts = [];
      this.filteredProducts = [];
    } finally {
      this.loading = false;
    }
  }

  private async getAllCategoryIds(category: CategoryDTO): Promise<number[]> {
    // For now, just return the category ID
    // In a full implementation, you'd recursively get all subcategory IDs
    let ids = [category.id];
    
    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        ids = ids.concat(await this.getAllCategoryIds(subcategory));
      }
    }
    
    return ids;
  }

  private updateProductsFromResult(result: any) {
    const products = result.items || [];
    
    this.allProducts = products.map((product: ProductListItemDTO) => ({
      id: product.id,
      title: product.name || 'Untitled Product',
      creator: product.creatorUsername || 'Unknown Creator',
      price: product.price,
      rating: product.averageRating,
      ratingCount: 0,
      image: this.ensureFullUrl(product.coverImageUrl),
      category: 'product',
      tags: ['Product'],
      badge: product.isPublic ? 'Public' : 'Private',
      inWishlist: false,
      loadingWishlist: false,
      wishlistHovered: false,
      isPurchased: false,
      loadingPurchase: false
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
        queryParams: { sort: this.sortBy }
      });
    }
  }

  private getCategorySlugById(categoryId: number): string | null {
    const slugMap: { [key: number]: string } = {
      1: 'fitness-health',
      2: 'self-improvement',
      3: 'writings-publishing-education',
      4: 'business-money',
      5: 'drawing-painting',
      6: '3d',
      7: 'music-sound-design',
      8: 'films',
      9: 'software-development',
      10: 'gaming',
      11: 'photography',
      12: 'comics-graphic-novels',
      13: 'fiction-books',
      14: 'education',
      15: 'design',
      110: 'audio',
      111: 'recorded-music'
    };
    
    return slugMap[categoryId] || null;
  }

  // Filtering and sorting
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
    this.sortProducts(filtered);

    this.filteredProducts = filtered;
  }

  private sortProducts(products: Product[]) {
    switch (this.sortBy) {
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
        products.sort((a, b) => b.ratingCount - a.ratingCount);
        break;
      default:
        // Curated - keep original order
        break;
    }
  }

  // Event handlers
  onSearch() {
    this.applyFilters();
  }

  onSortChange() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: this.sortBy, page: 1 },
      queryParamsHandling: 'merge'
    });
  }

  onPriceRangeChange() {
    this.applyFilters();
  }

  filterByRating(rating: number) {
    this.selectedRating = rating;
    this.applyFilters();
  }

  toggleTag(tag: string) {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
    this.applyFilters();
  }

  // Pagination
  onPageChange(page: number) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge'
    });
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
}
