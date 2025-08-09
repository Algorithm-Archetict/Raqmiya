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
    this.errorMessage = '';
    this.productService.getProductList(1, 100).subscribe({
      next: (products: ProductListItemDTO[]) => {
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
          badge: product.isPublic ? 'Public' : 'Private'
        }));
        this.recommendedProducts = this.allProducts.slice(0, 6);
        this.filteredProducts = [...this.allProducts];
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.errorMessage = 'Failed to load products. Please try again later.';
        this.allProducts = [];
        this.recommendedProducts = [];
        this.filteredProducts = [];
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
          tags: ['3D', 'Modeling', 'Advanced']
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
          tags: ['Fonts', 'Typography', 'Design']
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
