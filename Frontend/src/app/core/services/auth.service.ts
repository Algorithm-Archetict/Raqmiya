// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../models/auth/auth.model';
import { MockAuthService } from './mock-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private useMockService = false; // Set to false when you have a real backend

  // BehaviorSubject to track authentication status
  private _isLoggedIn = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this._isLoggedIn.asObservable();

  // BehaviorSubject to store user information (optional)
  private _currentUser = new BehaviorSubject<User | null>(null);
  currentUser$ = this._currentUser.asObservable();

  constructor(
    private http: HttpClient, 
    private router: Router,
    private mockAuthService: MockAuthService
  ) {
    if (this.hasToken()) {
      this.decodeTokenAndSetUser();
    }
  }

  // Check if a token exists in local storage
  private hasToken(): boolean {
    return !!localStorage.getItem('authToken');
  }

  // Decode token and set user (basic example, typically done server-side or with JWT helper)
  private decodeTokenAndSetUser(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Try to get user data from localStorage if it was stored during login
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          this._currentUser.next(user);
          this._isLoggedIn.next(true);
        } catch (error) {
          console.error('Error parsing user data:', error);
          // Clear invalid data and redirect to login
          this.logout();
        }
      } else {
        // No user data found, clear token and redirect to login
        this.logout();
      }
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    if (this.useMockService) {
      return this.mockAuthService.login(credentials).pipe(
        tap(response => {
          if (response.success && response.token) {
            localStorage.setItem('authToken', response.token);
            if (response.username) {
              const user: User = {
                id: '1',
                username: response.username,
                email: response.email || '',
                roles: response.roles || []
              };
              localStorage.setItem('userData', JSON.stringify(user));
              this._currentUser.next(user);
            }
            this._isLoggedIn.next(true);
          }
        })
      );
    } else {
      return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
        tap(response => {
          if (response.success && response.token) {
            localStorage.setItem('authToken', response.token);
            if (response.username) {
              const user: User = {
                id: '1',
                username: response.username,
                email: response.email || '',
                roles: response.roles || []
              };
              localStorage.setItem('userData', JSON.stringify(user));
              this._currentUser.next(user);
            }
            this._isLoggedIn.next(true);
          }
        })
      );
    }
  }

  register(userData: RegisterRequest): Observable<any> {
    if (this.useMockService) {
      return this.mockAuthService.register(userData);
    } else {
      return this.http.post(`${this.apiUrl}/auth/register`, userData);
    }
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData'); // Also remove user data
    this._isLoggedIn.next(false);
    this._currentUser.next(null);
    this.router.navigate(['/auth/login']); // Redirect to login page after logout
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getCurrentUsername(): string | null {
    return this._currentUser.getValue()?.username || null;
  }

  getCurrentUser(): User | null {
    return this._currentUser.getValue();
  }

  isLoggedIn(): boolean {
    return this._isLoggedIn.getValue();
  }

  hasRole(role: string): boolean {
    const user = this._currentUser.getValue();
    return user?.roles?.includes(role) || false;
  }

  isCreator(): boolean {
    return this.hasRole('Creator');
  }

  isAdmin(): boolean {
    return this.hasRole('Admin');
  }

  isCustomer(): boolean {
    return this.hasRole('Customer');
  }

  getUserRole(): string | null {
    const user = this._currentUser.getValue();
    return user?.roles?.[0] || null;
  }

  // Example: Check token validity (e.g., against an API endpoint)
  checkTokenValidity(): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/auth/validate-token`);
  }
}