import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  currentUser: any = null;
  isUserDropdownOpen: boolean = false;
  private authSubscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.isUserDropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeUserDropdown();
  }

  ngOnInit() {
    // Subscribe to authentication status changes
    this.authSubscription.add(
      this.authService.isLoggedIn$.subscribe(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
      })
    );

    this.authSubscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }

  // User dropdown methods
  toggleUserDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  closeUserDropdown(): void {
    this.isUserDropdownOpen = false;
  }

  logout() {
    this.closeUserDropdown();
    this.authService.logout();
  }

  getUsername(): string {
    return this.currentUser?.username || 'User';
  }

  getUserAvatar(): string | null {
    // Return user profile image if available, otherwise use initials fallback
    return this.currentUser?.profileImageUrl || null;
  }

  getUserInitials(): string {
    const username = this.getUsername();
    if (!username || username === 'User') {
      return 'U';
    }
    
    // Get first letter of username
    const firstChar = username.charAt(0).toUpperCase();
    
    // If username has multiple words, get first letter of second word too
    const words = username.split(' ');
    if (words.length > 1) {
      const secondChar = words[1].charAt(0).toUpperCase();
      return firstChar + secondChar;
    }
    
    return firstChar;
  }

  isCreator(): boolean {
    return this.authService.isCreator();
  }
}
