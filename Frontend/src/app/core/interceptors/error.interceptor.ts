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
      if (error.error instanceof ErrorEvent) {
        // Client-side errors
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side errors
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;

        // Handle specific HTTP status codes
        switch (error.status) {
          case 401: // Unauthorized
            console.error('Unauthorized request - redirecting to login');
            // Optionally, clear token and redirect to login
            // inject(AuthService).logout(); // If you want to force logout on 401
            router.navigate(['/auth/login']);
            break;
          case 403: // Forbidden
            console.error('Access denied!');
            router.navigate(['/access-denied']); // Example: redirect to an access denied page
            break;
          case 404: // Not Found
            console.error('Resource not found!');
            break;
          case 500: // Internal Server Error
            console.error('Server error. Please try again later.');
            break;
          default:
            console.error(`Backend returned code ${error.status}, body was:`, error.error);
            console.error('Full error details:', {
              status: error.status,
              statusText: error.statusText,
              url: error.url,
              error: error.error,
              message: error.message
            });
        }
      }
      // You could also show a user-friendly notification here (e.g., using a toast service)
      alert(errorMessage); // Simple alert for demonstration
      return throwError(() => new Error(errorMessage)); // Re-throw to be handled by subscribing component
    })
  );
};