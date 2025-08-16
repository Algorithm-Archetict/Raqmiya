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
  
  // Only add auth token to YOUR backend requests, not external APIs
  if (token && request.url.includes(environment.apiUrl)) {
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