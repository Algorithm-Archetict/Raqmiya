// src/app/core/guards/role-guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const creatorGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isCreator()) {
    return true;
  } else {
    // Redirect to home page if user is not a creator
    router.navigate(['/home']);
    return false;
  }
};

export const customerGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isCustomer()) {
    return true;
  } else {
    // Redirect to home page if user is not a customer
    router.navigate(['/home']);
    return false;
  }
};

export const roleGuard = (requiredRole: string) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasRole(requiredRole)) {
    return true;
  } else {
    // Redirect to home page if user doesn't have the required role
    router.navigate(['/home']);
    return false;
  }
}; 