// src/app/core/components/navbar/navbar.ts
import { Component, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ThemeService, Theme } from '../../services/theme.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit, AfterViewInit {
  isLoggedIn: boolean = false;
  username: string | null = null;
  userRole: string | null = null;
  isDropdownOpen: boolean = false;
  currentTheme: Theme = 'light';
  cartItemCount: number = 0;
  
  // Custom dropdown states
  isCategoriesDropdownOpen: boolean = false;
  isUserDropdownOpen: boolean = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private themeService: ThemeService,
    private cartService: CartService
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.isDropdownOpen = false;
      this.isCategoriesDropdownOpen = false;
      this.isUserDropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeAllDropdowns();
  }

  ngOnInit(): void {
    // Subscribe to authentication status changes
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.username = this.authService.getCurrentUsername();
        this.userRole = this.authService.getUserRole();
      } else {
        this.username = null;
        this.userRole = null;
      }
    });

    // Subscribe to theme changes
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });

    // Subscribe to cart changes
    this.cartService.cartItemCount$.subscribe(count => {
      this.cartItemCount = count;
    });
  }

  ngAfterViewInit(): void {
    // No need to initialize Bootstrap dropdowns since we're using custom implementation
  }

  // Categories dropdown methods
  toggleCategoriesDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isCategoriesDropdownOpen = !this.isCategoriesDropdownOpen;
    this.isUserDropdownOpen = false; // Close other dropdown
  }

  closeCategoriesDropdown(): void {
    this.isCategoriesDropdownOpen = false;
  }

  // User dropdown methods
  toggleUserDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
    this.isCategoriesDropdownOpen = false; // Close other dropdown
  }

  closeUserDropdown(): void {
    this.isUserDropdownOpen = false;
  }

  // General dropdown methods
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeAllDropdowns(): void {
    this.isDropdownOpen = false;
    this.isCategoriesDropdownOpen = false;
    this.isUserDropdownOpen = false;
  }

  closeDropdown(): void {
    this.closeAllDropdowns();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onLogout(): void {
    console.log('Logout clicked - executing logout...');
    this.closeAllDropdowns();
    this.authService.logout();
    // The AuthService will handle the navigation to login page
  }

  // Navigation methods for user dropdown
  navigateToProfile(): void {
    // For now, navigate to home page as placeholder
    this.router.navigate(['/home']);
    console.log('Navigate to Profile - Feature coming soon!');
  }

  navigateToSettings(): void {
    // For now, navigate to home page as placeholder
    this.router.navigate(['/home']);
    console.log('Navigate to Settings - Feature coming soon!');
  }
}