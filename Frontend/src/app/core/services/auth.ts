// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment'; // Assuming you have an environments setup
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../../models/auth.model'; // We'll define these models soon

@Injectable({
  providedIn: 'root' // This makes the service a singleton available throughout the app
})
export class AuthService {
  private apiUrl = environment.apiUrl; // Base URL for your API

  // BehaviorSubject to track authentication status
  private _isLoggedIn = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this._isLoggedIn.asObservable();

  // BehaviorSubject to store user information (optional)
  private _currentUser = new BehaviorSubject<User | null>(null);
  currentUser$ = this._currentUser.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    if (this.hasToken()) {
      this.decodeTokenAndSetUser(); // Attempt to set user on app start if token exists
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
          // Fallback to dummy user if parsing fails
          const dummyUser: User = { id: '1', username: 'demoUser', email: 'user@example.com' };
          this._currentUser.next(dummyUser);
          this._isLoggedIn.next(true);
        }
      } else {
        // Fallback to dummy user if no user data found
        const dummyUser: User = { id: '1', username: 'demoUser', email: 'user@example.com' };
        this._currentUser.next(dummyUser);
        this._isLoggedIn.next(true);
      }
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('authToken', response.token);
        // Store user data in localStorage for persistence
        if (response.username) {
          const user: User = {
            id: '1', // We don't have user ID from backend, using placeholder
            username: response.username,
            email: response.email || ''
          };
          localStorage.setItem('userData', JSON.stringify(user));
          this._currentUser.next(user);
        }
        this._isLoggedIn.next(true);
      })
    );
  }

  register(userData: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
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

  // Example: Check token validity (e.g., against an API endpoint)
  checkTokenValidity(): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/auth/validate-token`);
  }
}