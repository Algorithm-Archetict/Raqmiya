import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { ProductListItemDTO } from '../../core/models/product/product-list-item.dto';
import { Alert } from '../../shared/alert/alert';

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
}

@Component({
  selector: 'app-discover',
  imports: [CommonModule, FormsModule, Alert],
  templateUrl: './discover.html',
  styleUrl: './discover.css'
})
export class Discover implements OnInit {
  @ViewChild('carouselContainer') carouselContainer!: ElementRef;

  // Search and Filter Properties
  searchQuery: string = '';
  selectedCategory: string = 'all';
  priceRange: number = 50;
  selectedRating: number = 0;
  selectedTags: string[] = [];
  sortBy: string = 'relevance';
  loading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Product Data
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  recommendedProducts: Product[] = [];
  popularTags: string[] = ['3D', 'Design', 'Audio', 'Templates', 'Icons', 'Fonts', 'Graphics', 'Code'];

  // Pagination
  pageSize: number = 12;
  currentPage: number = 1;
  totalPages: number = 1;
  hasNextPage: boolean = false;

  constructor(
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit() {
  this.initializeProducts();
  }

  // Use centralized URL builder from ProductService

  // Initialize product data from API
  initializeProducts() {
    this.errorMessage = '';
    this.fetchProducts(1, false);
  }

  private mapDTOToProduct(product: ProductListItemDTO): Product {
    return {
      id: product.id,
      title: product.name || 'Untitled Product',
      creator: product.creatorUsername || 'Unknown Creator',
      price: product.price,
      rating: product.averageRating,
      ratingCount: product.salesCount,
      image: this.productService.buildFullUrl(product.coverImageUrl) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop',
      category: 'design',
      tags: ['Design'],
      badge: product.isPublic ? 'Public' : 'Private'
    };
  }

  private fetchProducts(page: number, append: boolean) {
    this.loading = true;
    this.productService.getProducts(page, this.pageSize).subscribe({
      next: (res) => {
        const mapped = (res.items || []).map(p => this.mapDTOToProduct(p));
        if (append) {
          this.allProducts.push(...mapped);
        } else {
          this.allProducts = mapped;
        }

        // Update recommendations from the first page only
        if (res.pageNumber === 1) {
          this.recommendedProducts = this.allProducts.slice(0, 6);
        }

        // Update pagination state
        this.currentPage = res.pageNumber;
        this.totalPages = res.totalPages;
        this.hasNextPage = res.hasNextPage;

        // Apply filters to reflect the latest list
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.errorMessage = 'Failed to load products. Please try again later.';
        if (!append) {
          this.allProducts = [];
          this.filteredProducts = [];
          this.recommendedProducts = [];
        }
        this.loading = false;
      }
    });
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
  if (this.loading || !this.hasNextPage) return;
  this.fetchProducts(this.currentPage + 1, true);
  }

  // Navigate to product details
  viewProduct(productId: number) {
    this.router.navigate(['/discover', productId]);
  }
}
