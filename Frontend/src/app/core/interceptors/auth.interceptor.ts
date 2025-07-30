// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth'; // Import your AuthService

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const authToken = authService.getToken(); // Get token from AuthService

  // Debug logging for product creation requests
  if (req.url.includes('/Products') && req.method === 'POST') {
    console.log('AuthInterceptor: Processing product creation request');
    console.log('AuthInterceptor: URL:', req.url);
    console.log('AuthInterceptor: Token present:', !!authToken);
    console.log('AuthInterceptor: User role:', authService.getUserRole());
    console.log('AuthInterceptor: Request headers:', req.headers);
    console.log('AuthInterceptor: Request body:', req.body);
  }

  // Clone the request and add the Authorization header if a token exists
  if (authToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });
  }

  return next(req); // Continue with the modified (or original) request
};