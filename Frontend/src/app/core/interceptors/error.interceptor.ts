// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router'; // For potential redirection on certain errors
import { inject } from '@angular/core'; // To inject services

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router); // Inject the router

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unknown error occurred!';
      
      console.error('HTTP Error Details:', {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        method: req.method,
        error: error.error,
        message: error.message
      });

      if (error.error instanceof ErrorEvent) {
        // Client-side errors
        errorMessage = `Client Error: ${error.error.message}`;
      } else {
        // Server-side errors
        let serverMessage = '';
        
        // Try to extract error message from different response formats
        if (error.error) {
          if (typeof error.error === 'string') {
            serverMessage = error.error;
          } else if (error.error.message) {
            serverMessage = error.error.message;
          } else if (error.error.title) {
            serverMessage = error.error.title;
          } else if (error.error.detail) {
            serverMessage = error.error.detail;
          } else if (error.error.errors && Array.isArray(error.error.errors)) {
            serverMessage = error.error.errors.map((e: any) => e.message || e).join(', ');
          }
        }

        errorMessage = `Error Code: ${error.status}\nMessage: ${serverMessage || error.message}`;

        // Handle specific HTTP status codes
        switch (error.status) {
          case 400:
            console.error('Bad Request - Invalid data sent to server');
            break;
          case 401: // Unauthorized
            console.error('Unauthorized request - redirecting to login');
            router.navigate(['/auth/login']);
            break;
          case 403: // Forbidden
            console.error('Access denied!');
            router.navigate(['/access-denied']);
            break;
          case 404: // Not Found
            console.error('Resource not found!');
            break;
          case 415: // Unsupported Media Type
            console.error('Unsupported media type - check file formats');
            break;
          case 422: // Unprocessable Entity
            console.error('Validation error - check input data');
            break;
          case 500: // Internal Server Error
            console.error('Server error. Please try again later.');
            break;
          case 502: // Bad Gateway
            console.error('Bad gateway - server communication issue');
            break;
          case 503: // Service Unavailable
            console.error('Service unavailable - server maintenance');
            break;
          default:
            console.error(`Backend returned code ${error.status}, body was:`, error.error);
        }
      }
      
      // Don't show alert for every error - let components handle their own error display
      // alert(errorMessage); // Commented out to avoid annoying alerts
      
      return throwError(() => new Error(errorMessage)); // Re-throw to be handled by subscribing component
    })
  );
};