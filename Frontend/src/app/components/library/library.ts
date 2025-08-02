import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';

interface LibraryProduct {
  id: string;
  title: string;
  image: string;
  creator: string;
  creatorLink: string;
  showMenu: boolean;
  type: 'purchased' | 'wishlist' | 'reviews';
}

@Component({
  selector: 'app-library',
  imports: [CommonModule, RouterModule, DashboardSidebar],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class Library implements OnInit {
  activeTab: 'purchased' | 'wishlist' | 'reviews' = 'purchased';
  showDeleteModal: boolean = false;
  productToDelete: LibraryProduct | null = null;

  // Mock data for different tabs
  purchasedProducts: LibraryProduct[] = [
    {
      id: '1',
      title: 'Flex - Transitions for Premiere Pro',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
      creator: 'DigitalArt Studio',
      creatorLink: '#',
      showMenu: false,
      type: 'purchased'
    },
    {
      id: '2',
      title: 'Premium Digital Art Collection',
      image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop',
      creator: 'Creative Designs',
      creatorLink: '#',
      showMenu: false,
      type: 'purchased'
    },
    {
      id: '3',
      title: 'Motion Graphics Template Pack',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
      creator: 'Motion Studio',
      creatorLink: '#',
      showMenu: false,
      type: 'purchased'
    }
  ];

  wishlistProducts: LibraryProduct[] = [
    {
      id: '4',
      title: 'UI/UX Design System',
      image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop',
      creator: 'Design Lab',
      creatorLink: '#',
      showMenu: false,
      type: 'wishlist'
    },
    {
      id: '5',
      title: '3D Character Models',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
      creator: '3D Studio',
      creatorLink: '#',
      showMenu: false,
      type: 'wishlist'
    }
  ];

  reviewProducts: LibraryProduct[] = [
    {
      id: '6',
      title: 'Video Editing Masterclass',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
      creator: 'Video Academy',
      creatorLink: '#',
      showMenu: false,
      type: 'reviews'
    }
  ];

  constructor() {}

  ngOnInit() {
    // Initialize component
  }

  setActiveTab(tab: 'purchased' | 'wishlist' | 'reviews') {
    this.activeTab = tab;
    // Close any open menus when switching tabs
    this.closeAllMenus();
  }

  getCurrentProducts(): LibraryProduct[] {
    switch (this.activeTab) {
      case 'purchased':
        return this.purchasedProducts;
      case 'wishlist':
        return this.wishlistProducts;
      case 'reviews':
        return this.reviewProducts;
      default:
        return this.purchasedProducts;
    }
  }

  openActionMenu(productId: string) {
    // Close all other menus first
    this.closeAllMenus();
    
    // Find and open the clicked product's menu
    const allProducts = [...this.purchasedProducts, ...this.wishlistProducts, ...this.reviewProducts];
    const product = allProducts.find(p => p.id === productId);
    if (product) {
      product.showMenu = true;
    }
  }

  closeAllMenus() {
    const allProducts = [...this.purchasedProducts, ...this.wishlistProducts, ...this.reviewProducts];
    allProducts.forEach(product => {
      product.showMenu = false;
    });
  }

  deleteProduct(product: LibraryProduct) {
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
      // Remove product from the appropriate array
      switch (this.productToDelete.type) {
        case 'purchased':
          this.purchasedProducts = this.purchasedProducts.filter(p => p.id !== this.productToDelete!.id);
          break;
        case 'wishlist':
          this.wishlistProducts = this.wishlistProducts.filter(p => p.id !== this.productToDelete!.id);
          break;
        case 'reviews':
          this.reviewProducts = this.reviewProducts.filter(p => p.id !== this.productToDelete!.id);
          break;
      }
      
      this.closeDeleteModal();
    }
  }
}
