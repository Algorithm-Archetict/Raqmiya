// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, map, of } from 'rxjs';
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
      // Always fetch fresh user data from server to ensure data integrity
      this.fetchUserProfile().subscribe({
        next: (user) => {
          if (user) {
            this._currentUser.next(user);
            this._isLoggedIn.next(true);
          } else {
            // If fetch fails, clear everything and redirect to login
            this.logout();
          }
        },
        error: (error) => {
          console.error('Error fetching user profile:', error);
          // If fetch fails, clear token and redirect to login
          this.logout();
        }
            });
  }

  }

  // Forgot Password
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  // Reset Password
  resetPassword(resetData: { token: string; newPassword: string; confirmPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, resetData);
  }

  // Verify Reset Token
  verifyResetToken(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/verify-reset-token`, { params: { token } });
  }

  // Verify Email
  verifyEmail(verificationData: { token: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/verify-email`, verificationData);
  }

  // Resend Verification Email
  resendVerification(resendData: { email: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/resend-verification`, resendData);
  }

  // Account Deletion Methods
  requestAccountDeletion(deletionData: { password: string; deletionReason: string; confirmDeletion: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/request-account-deletion`, deletionData);
  }

  confirmAccountDeletion(confirmationData: { token: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/confirm-account-deletion`, confirmationData);
  }

  restoreAccount(restoreData: { token: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/restore-account`, restoreData);
  }

  cancelAccountDeletion(cancelData: { token: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/cancel-account-deletion`, cancelData);
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    if (this.useMockService) {
      return this.mockAuthService.login(credentials).pipe(
        tap(response => {
          if (response.success && response.token) {
            // Clear any existing user data first
            this.clearUserData();
            localStorage.setItem('authToken', response.token);
            if (response.username) {
              const user: User = {
                id: 1,
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
            // Clear any existing user data first
            this.clearUserData();
            localStorage.setItem('authToken', response.token);
            // Fetch complete user profile after successful login
            this.fetchUserProfile().subscribe({
              next: (user) => {
                if (user) {
                  this._currentUser.next(user);
                  this._isLoggedIn.next(true);
                }
              },
              error: (error) => {
                console.error('Error fetching user profile after login:', error);
                // If fetch fails, clear token and redirect to login
                this.logout();
              }
            });
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
    this.clearUserData();
    this._isLoggedIn.next(false);
    this._currentUser.next(null);
    this.router.navigate(['/auth/login']); // Redirect to login page after logout
  }

  // Clear all user-related data
  private clearUserData(): void {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Clear sessionStorage as well for better isolation
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');

    // Clear chatbot data
    this.clearChatbotData();

    // Also clear any cached user data in other services
    // This ensures complete data isolation between users
    // Note: We can't inject UserService here due to circular dependency
    // The UserService will clear its cache when it encounters errors
  }

  // Clear chatbot data when user logs out
  private clearChatbotData(): void {
    // Clear chatbot chat history but preserve knowledge base for all users
    localStorage.removeItem('chatbot_chat_history');
    localStorage.removeItem('chatbot_messages');
    console.log('Chatbot chat data cleared on logout (knowledge base preserved)');
  }

  // Public method to clear all cached data (useful for user switching)
  public clearAllCachedData(): void {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Clear sessionStorage as well for better isolation
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    
    // Clear chatbot data
    this.clearChatbotData();
    
    // Update authentication status
    this._currentUser.next(null);
    this._isLoggedIn.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getCurrentUsername(): string | null {
    return this._currentUser.getValue()?.username || null;
  }

  // Get current user email
  getCurrentUserEmail(): string | null {
    const currentUser = this._currentUser.value;
    if (currentUser && currentUser.email) {
      return currentUser.email;
    }

    // Fallback to localStorage if currentUser is not set
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.email || null;
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }

    return null;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this._currentUser.value;
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

  // Fetch complete user profile from backend
  fetchUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(
      tap(user => {
        if (user) {
          // Add roles array for compatibility
          user.roles = user.role ? [user.role] : [];
          localStorage.setItem('userData', JSON.stringify(user));
          this._currentUser.next(user);
          this._isLoggedIn.next(true);
        }
      }),
      catchError(error => {
        console.error('Error fetching user profile:', error);
        throw error;
      })
    );
  }

  // Validate token and refresh user data if needed
  validateAndRefreshUserData(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      this.logout();
      return of(false);
    }

    // First validate the token
    return this.http.get<boolean>(`${this.apiUrl}/auth/validate-token`).pipe(
      map(isValid => {
        if (isValid) {
          // Token is valid, now fetch user data
          this.fetchUserProfile().subscribe({
            next: (user) => {
              if (user) {
                this._currentUser.next(user);
                this._isLoggedIn.next(true);
              } else {
                this.logout();
              }
            },
            error: (error) => {
              console.error('Error fetching user profile after token validation:', error);
              this.logout();
            }
          });
          return true;
        } else {
          this.logout();
          return false;
        }
      }),
      catchError(error => {
        console.error('Token validation failed:', error);
        this.logout();
        return of(false);
      })
    );
  }

  // Example: Check token validity (e.g., against an API endpoint)
  checkTokenValidity(): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/auth/validate-token`);
  }

  // Debug method to test user data isolation
  debugUserInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/debug-user`);
  }

  // Method to test if current user data matches the token
  validateUserDataIntegrity(): Observable<boolean> {
    return this.debugUserInfo().pipe(
      tap(debugInfo => {
        const currentUser = this.getCurrentUser();
        if (currentUser && debugInfo) {
          const tokenUserId = parseInt(debugInfo.UserId);
          const cachedUserId = currentUser.id;

          if (tokenUserId !== cachedUserId) {
            console.error('User data integrity check failed!');
            console.error('Token UserId:', tokenUserId);
            console.error('Cached UserId:', cachedUserId);
            // Clear cached data and force refresh
            this.clearAllCachedData();
            this.fetchUserProfile().subscribe();
          }
        }
      }),
      map(() => true),
      catchError(error => {
        console.error('User data integrity check error:', error);
        return of(false);
      })
    );
  }
}
