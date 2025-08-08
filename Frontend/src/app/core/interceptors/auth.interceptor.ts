import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export const AuthInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);

  // Get token directly from localStorage to avoid circular dependency
  const token = localStorage.getItem('authToken');
  
  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expired or invalid - clear all user data and redirect to login
        console.warn('Authentication error detected, logging out user');
        // Clear localStorage directly to avoid circular dependency
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.navigate(['/login']);
      } else if (error.status === 403) {
        // Forbidden - user doesn't have permission
        console.warn('Access forbidden for user');
        // Don't logout for 403, just show error
      }
      return throwError(() => error);
    })
  );
}; 