import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-sidebar',
  imports: [CommonModule, RouterModule,RouterLink],
  templateUrl: './dashboard-sidebar.html',
  styleUrl: './dashboard-sidebar.css'
})
export class DashboardSidebar implements OnInit {
  currentRoute: string = '';
  isCreator: boolean = false;
  isCustomer: boolean = false;
  isAdmin: boolean = false;
  isLoggedIn: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Get current route on component init
    this.currentRoute = this.router.url;
    
    // Listen for route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
    });

    // Check authentication status
    this.checkAuthStatus();

    // Listen for authentication changes
    this.authService.isLoggedIn$.subscribe(() => {
      this.checkAuthStatus();
    });

    // Listen for user changes to update role-based visibility
    this.authService.currentUser$.subscribe(() => {
      this.checkAuthStatus();
    });
  }

  checkAuthStatus() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isCreator = this.authService.isCreator();
    this.isCustomer = this.authService.isCustomer();
  this.isAdmin = this.authService.isAdmin();
    
    // Debug logging
    console.log('Dashboard Sidebar - Auth Status:', {
      isLoggedIn: this.isLoggedIn,
      isCreator: this.isCreator,
      isCustomer: this.isCustomer,
  isAdmin: this.isAdmin,
      currentUser: this.authService.getCurrentUser()
    });
  }

  logout() {
    this.authService.logout();
  }

  isActive(route: string): boolean {
    return this.currentRoute === route;
  }
}
