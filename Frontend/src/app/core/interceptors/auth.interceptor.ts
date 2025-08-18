import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export const AuthInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);

  // Get token directly from localStorage to avoid circular dependency
  const token = localStorage.getItem('authToken');
  
  // Define public endpoints that don't require authentication
  const publicEndpoints = [
    '/subscription/creator/', // Creator profile endpoint
    '/products', // Product listing (public)
    '/products/', // Individual product details (public)
    '/categories', // Category listing (public)
    '/auth/login', // Login endpoint
    '/auth/register', // Register endpoint
  ];
  
  // Check if this is a public endpoint
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    request.url.includes(environment.apiUrl + endpoint)
  );
  
  // Only add auth token to YOUR backend requests that are NOT public endpoints
  if (token && request.url.includes(environment.apiUrl) && !isPublicEndpoint) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only handle authentication errors from YOUR backend, not external APIs
      if (error.status === 401 && request.url.includes(environment.apiUrl)) {
        // Token expired or invalid - clear all user data and redirect to login
        console.warn('Authentication error detected from backend, logging out user');
        // Clear localStorage directly to avoid circular dependency
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.navigate(['/login']);
      } else if (error.status === 403 && request.url.includes(environment.apiUrl)) {
        // Forbidden - user doesn't have permission (only from your backend)
        console.warn('Access forbidden for user from backend');
        // Don't logout for 403, just show error
      } else {
        // External API errors (like OpenAI) - just log, don't redirect
        console.warn('External API error (non-auth):', error.status, error.message);
      }
      return throwError(() => error);
    })
  );
}; 