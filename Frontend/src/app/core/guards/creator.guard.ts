import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CreatorGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.isLoggedIn() && this.authService.isCreator()) {
      return true;
    } else if (this.authService.isLoggedIn()) {
      // User is logged in but not a creator
      this.router.navigate(['/discover']);
      return false;
    } else {
      // User is not logged in
      this.router.navigate(['/login']);
      return false;
    }
  }
} 