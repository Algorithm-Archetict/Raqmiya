import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CreatorGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // First check if we have a token
    if (!this.authService.getToken()) {
      this.router.navigate(['/auth/login']);
      return of(false);
    }

    // Validate the token with the backend to ensure it's still valid
    return this.authService.validateAndRefreshUserData().pipe(
      map(isValid => {
        if (isValid) {
          // Check if user is a creator
          if (this.authService.isCreator()) {
            return true;
          } else {
            // User is logged in but not a creator
            this.router.navigate(['/discover']);
            return false;
          }
        } else {
          this.router.navigate(['/auth/login']);
          return false;
        }
      }),
      catchError(error => {
        console.error('CreatorGuard validation error:', error);
        this.router.navigate(['/auth/login']);
        return of(false);
      })
    );
  }
} 