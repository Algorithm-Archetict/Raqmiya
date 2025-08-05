import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DashboardSidebar } from '../../../dashboard-sidebar/dashboard-sidebar';
import { ProductService } from '../../../../core/services/product.service';
import { ProductListItemDTO } from '../../../../core/models/product/product-list-item.dto';
import { AuthService } from '../../../../core/services/auth.service';

interface Product {
  id: number;
  title: string;
  image: string;
  sales: number;
  revenue: number;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  productLink: string;
  showMenu: boolean;
}

@Component({
  selector: 'app-all-products',
  imports: [CommonModule, RouterModule, DashboardSidebar],
  templateUrl: './all-products.html',
  styleUrl: './all-products.css'
})
export class AllProducts implements OnInit {
  products: Product[] = [];
  showDeleteModal: boolean = false;
  productToDelete: Product | null = null;
  loading: boolean = false;
  error: string = '';

  constructor(
    private router: Router,
    private productService: ProductService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Load products - in a real app, this would fetch from an API
    this.loadProducts();
  }

  // Handle clicks outside dropdown menus
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Check if the click was outside any menu button or dropdown
    const target = event.target as HTMLElement;
    const isMenuButton = target.closest('.menu-btn');
    const isMenuDropdown = target.closest('.menu-dropdown');
    
    // If click was outside both menu button and dropdown, close all menus
    if (!isMenuButton && !isMenuDropdown) {
      this.closeAllMenus();
    }
  }

  loadProducts() {
    this.loading = true;
    this.error = '';
    
    // Get current user to filter products
    const currentUser = this.authService.getCurrentUser();
    const currentUsername = this.authService.getCurrentUsername();
    
    // Use getMyProducts (which currently calls the main products endpoint)
    this.productService.getMyProducts(1, 50).subscribe({
      next: (response: any) => {
        // Handle different response structures
        let products: ProductListItemDTO[] = [];
        
        if (Array.isArray(response)) {
          products = response;
        } else if (response && response.items && Array.isArray(response.items)) {
          products = response.items;
        } else if (response && Array.isArray(response.data)) {
          products = response.data;
        } else {
          console.warn('Unexpected response structure:', response);
          products = [];
        }
        
        // Filter products to only show those created by the current user
        const myProducts = products.filter(product => 
          product && product.creatorUsername === currentUsername
        );
        
        this.products = myProducts.map(product => ({
          id: product.id,
          title: product.name || 'Untitled Product',
          image: product.coverImageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&h=80&fit=crop',
          sales: product.salesCount || 0,
          revenue: (product.salesCount || 0) * (product.price || 0),
          price: product.price || 0,
          status: (product.status as 'pending' | 'approved' | 'rejected') || 'pending',
          productLink: product.permalink || `creator.raqmiya.com/product/${product.id}`,
          showMenu: false
        }));
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.error = 'Failed to load products. Please try again.';
        this.loading = false;
        // Set empty array to show "no products" state
        this.products = [];
      }
    });
  }

  get hasProducts(): boolean {
    return this.products.length > 0;
  }

  get totalSales(): number {
    return this.products.reduce((total, product) => total + product.sales, 0);
  }

  get totalRevenue(): number {
    return this.products.reduce((total, product) => total + product.revenue, 0);
  }

  openActionMenu(productId: number) {
    // Find the clicked product
    const clickedProduct = this.products.find(p => p.id === productId);
    if (!clickedProduct) return;
    
    // If this menu is already open, close it
    if (clickedProduct.showMenu) {
      clickedProduct.showMenu = false;
      return;
    }
    
    // Close all other menus first
    this.closeAllMenus();
    
    // Open the clicked product's menu
    clickedProduct.showMenu = true;
  }

  closeAllMenus() {
    this.products.forEach(product => {
      product.showMenu = false;
    });
  }

  deleteProduct(product: Product) {
    this.productToDelete = product;
    this.showDeleteModal = true;
    this.closeAllMenus();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  confirmDelete() {
    if (this.productToDelete) {
      this.productService.deleteProduct(this.productToDelete.id).subscribe({
        next: () => {
          // Remove product from the array
          this.products = this.products.filter(p => p.id !== this.productToDelete!.id);
          this.closeDeleteModal();
        },
        error: (error: any) => {
          console.error('Error deleting product:', error);
          // You might want to show an error message to the user
        }
      });
    }
  }

  editProduct(product: Product) {
    this.router.navigate(['/products', product.id, 'edit']);
    this.closeAllMenus();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'pending':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }
}
