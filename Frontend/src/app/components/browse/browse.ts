import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { ProductListItemDTO } from '../../core/models/product/product-list-item.dto';
import { CategoryDTO } from '../../core/models/product/category.dto';
import { SearchHeader } from '../shared/search-header/search-header';

interface Product {
  id: number;
  title: string;
  creator: string;
  price: number;
  rating: number;
  ratingCount: number;
  image: string;
  category: CategoryDTO;
  tags: string[];
  badge?: string;
}

@Component({
  selector: 'app-browse',
  imports: [CommonModule, FormsModule, SearchHeader],
  templateUrl: './browse.html',
  styleUrl: './browse.css'
})
export class Browse implements OnInit {
  // Search and Filter Properties
  searchQuery: string = '';
  selectedCategory: string = 'all';
  loading: boolean = false;

  // Product Data
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];

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
    
    this.productService.getProductList(1, 100).subscribe({
      next: (products: ProductListItemDTO[]) => {
        this.allProducts = products.map(product => ({
          id: product.id,
          title: product.name || 'Untitled Product',
          creator: product.creatorUsername || 'Unknown Creator',
          price: product.price,
          rating: product.averageRating,
          ratingCount: product.salesCount,
          image: this.ensureFullUrl(product.coverImageUrl),
          category: product.category,
          tags: [], // Assuming tags are not directly in ProductListItemDTO for now
          badge: product.isPublic ? 'Public' : 'Private'
        }));
        
        this.filteredProducts = [...this.allProducts];
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.allProducts = [];
        this.filteredProducts = [];
        this.loading = false;
      }
    });
  }

  // Search functionality
  onSearch(query: string) {
    this.searchQuery = query;
    this.applyFilters();
  }

  // Category filtering
  filterByCategory(category: string) {
    this.selectedCategory = category;
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
      //filtered = filtered.filter(product => product.category === this.selectedCategory);
    }

    this.filteredProducts = filtered;
  }

  // Navigate to product details
  viewProduct(productId: number) {
    this.router.navigate(['/discover', productId]);
  }
} 