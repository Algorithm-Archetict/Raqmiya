import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    // Check if user is logged in and has admin role
    if (this.authService.isLoggedIn() && this.authService.hasRole('Admin')) {
      return true;
    }
    
    // Redirect to home if not authorized
    this.router.navigate(['/home']);
    return false;
  }
} 