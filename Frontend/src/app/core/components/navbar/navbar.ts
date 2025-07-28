// src/app/core/components/navbar/navbar.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router'; // Import Router for logout, RouterLink/Active for navigation
import { AuthService } from '../../services/auth'; // Import AuthService

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,       // Enables routerLink directive
    RouterLinkActive  // Enables routerLinkActive directive for active link styling
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {
  isLoggedIn: boolean = false;
  username: string | null = null; // To display username in navbar
  isDropdownOpen: boolean = false; // Add dropdown state

  constructor(private authService: AuthService, private router: Router) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close dropdown if clicking outside
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.isDropdownOpen = false;
    }
  }

  ngOnInit(): void {
    // Subscribe to authentication status changes
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.username = this.authService.getCurrentUsername(); // Get username
      } else {
        this.username = null;
      }
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  onLogout(): void {
    this.closeDropdown();
    this.authService.logout();
    this.router.navigate(['/auth/login']); // Redirect to login page after logout
  }
}