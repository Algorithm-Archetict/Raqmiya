// src/app/core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth'; // Import your AuthService
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn$.pipe(
    map(isLoggedIn => {
      if (isLoggedIn) {
        return true; // Allow navigation if logged in
      } else {
        // Redirect to login page if not logged in
        router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false; // Prevent navigation
      }
    })
  );
};