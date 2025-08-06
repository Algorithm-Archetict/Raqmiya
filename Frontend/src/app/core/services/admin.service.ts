// src/app/services/admin-user.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AdminUserDTO } from '../models/admin/admin-user.dto';
import { CreateAdminUserDTO } from '../models/admin/create-admin-user.dto';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private baseUrl = 'http://localhost:5255/api/admin/users';
  private useFallbackData = false; // Set to true if backend is not ready

  constructor(private http: HttpClient) {}

  // Temporary fallback data for development
  private fallbackUsers: AdminUserDTO[] = [
    {
      id: 1,
      email: 'admin@raqmiya.com',
      username: 'admin',
      role: 'Admin',
      isActive: true
    },
    {
      id: 2,
      email: 'creator1@raqmiya.com',
      username: 'creator1',
      role: 'Creator',
      isActive: true
    },
    {
      id: 3,
      email: 'creator2@raqmiya.com',
      username: 'creator2',
      role: 'Creator',
      isActive: false
    },
    {
      id: 4,
      email: 'customer1@raqmiya.com',
      username: 'customer1',
      role: 'Customer',
      isActive: true
    },
    {
      id: 5,
      email: 'customer2@raqmiya.com',
      username: 'customer2',
      role: 'Customer',
      isActive: true
    }
  ];

  getAllUsers(): Observable<AdminUserDTO[]> {
    if (this.useFallbackData) {
      console.log('Using fallback data for getAllUsers');
      return of([...this.fallbackUsers]);
    }

    console.log('Making API call to:', this.baseUrl);
    return this.http.get<AdminUserDTO[]>(this.baseUrl).pipe(
      tap(response => console.log('API Response:', response)),
      catchError(this.handleError)
    );
  }

  getUserById(id: number): Observable<AdminUserDTO> {
    if (this.useFallbackData) {
      console.log('Using fallback data for getUserById:', id);
      const user = this.fallbackUsers.find(u => u.id === id);
      if (user) {
        return of(user);
      } else {
        return throwError(() => new Error('User not found'));
      }
    }

    console.log('Making API call to:', `${this.baseUrl}/${id}`);
    return this.http.get<AdminUserDTO>(`${this.baseUrl}/${id}`).pipe(
      tap(response => console.log('API Response:', response)),
      catchError(this.handleError)
    );
  }

  createUser(user: CreateAdminUserDTO): Observable<void> {
    if (this.useFallbackData) {
      console.log('Using fallback data for createUser:', user);
      const newUser: AdminUserDTO = {
        id: this.fallbackUsers.length + 1,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: true
      };
      this.fallbackUsers.push(newUser);
      return of(void 0);
    }

    console.log('Making API call to create user:', user);
    return this.http.post<void>(this.baseUrl, user).pipe(
      tap(() => console.log('User created successfully')),
      catchError(this.handleError)
    );
  }

  activateUser(id: number): Observable<void> {
    if (this.useFallbackData) {
      console.log('Using fallback data for activateUser:', id);
      const user = this.fallbackUsers.find(u => u.id === id);
      if (user) {
        user.isActive = true;
        return of(void 0);
      } else {
        return throwError(() => new Error('User not found'));
      }
    }

    console.log('Making API call to activate user:', id);
    return this.http.post<void>(`${this.baseUrl}/${id}/activate`, {}).pipe(
      tap(() => console.log('User activated successfully')),
      catchError(this.handleError)
    );
  }

  deactivateUser(id: number): Observable<void> {
    if (this.useFallbackData) {
      console.log('Using fallback data for deactivateUser:', id);
      const user = this.fallbackUsers.find(u => u.id === id);
      if (user) {
        user.isActive = false;
        return of(void 0);
      } else {
        return throwError(() => new Error('User not found'));
      }
    }

    console.log('Making API call to deactivate user:', id);
    return this.http.post<void>(`${this.baseUrl}/${id}/deactivate`, {}).pipe(
      tap(() => console.log('User deactivated successfully')),
      catchError(this.handleError)
    );
  }

  // Method to switch to fallback data
  setUseFallbackData(useFallback: boolean): void {
    this.useFallbackData = useFallback;
    console.log(`AdminService: ${useFallback ? 'Using fallback data' : 'Using real API'}`);
  }

  // Method to check current mode
  isUsingFallbackData(): boolean {
    return this.useFallbackData;
  }

  private handleError(error: HttpErrorResponse) {
    console.error('AdminService error details:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      error: error.error,
      message: error.message
    });

    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Authentication required. Please log in.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'Resource not found.';
          break;
        case 409:
          errorMessage = 'Conflict: The resource already exists or cannot be created.';
          break;
        case 500:
          errorMessage = 'Server error. Please check your backend implementation.';
          break;
        default:
          errorMessage = `Server error: ${error.status} - ${error.message}`;
      }
    }
    
    console.error('AdminService error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
