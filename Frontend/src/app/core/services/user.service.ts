import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  UserProfile, 
  UserProfileUpdateRequest, 
  UserProfileUpdateResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  UploadProfileImageResponse
} from '../models/user/user-profile.model';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Don't auto-load user in constructor to avoid issues
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private getFormDataHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Load current user profile from API
   */
  loadCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/users/me`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(user => this.updateLocalUser(user)),
      catchError(error => {
        console.error('Error loading user:', error);
        // Clear cached user data on error
        this.clearLocalUser();
        return of(null as any);
      })
    );
  }

  /**
   * Get current user profile (from cache or API)
   */
  getCurrentUser(): Observable<UserProfile> {
    const cachedUser = this.currentUserSubject.value;
    if (cachedUser) {
      return of(cachedUser);
    }
    return this.loadCurrentUser();
  }

  /**
   * Force refresh user data from server (bypass cache)
   */
  forceRefreshUser(): Observable<UserProfile> {
    return this.loadCurrentUser();
  }

  /**
   * Update user profile
   */
  updateProfile(updateData: UserProfileUpdateRequest): Observable<UserProfileUpdateResponse> {
    return this.http.put<UserProfileUpdateResponse>(`${this.apiUrl}/users/me`, updateData, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.updateLocalUser(response.user);
        }
      }),
      catchError(error => {
        console.error('Error updating profile:', error);
        return of({
          success: false,
          message: 'Failed to update profile'
        });
      })
    );
  }

  /**
   * Change user password
   */
  changePassword(passwordData: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>(`${this.apiUrl}/users/me/change-password`, passwordData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error changing password:', error);
        return of({
          success: false,
          message: 'Failed to change password'
        });
      })
    );
  }

  /**
   * Upload profile image
   */
  uploadProfileImage(image: File): Observable<UploadProfileImageResponse> {
    const formData = new FormData();
    formData.append('image', image);

    return this.http.post<UploadProfileImageResponse>(`${this.apiUrl}/users/me/upload-image`, formData, {
      headers: this.getFormDataHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error uploading image:', error);
        return of({
          success: false,
          message: 'Failed to upload image'
        });
      })
    );
  }

  /**
   * Check if user has a profile image
   */
  hasProfileImage(user: UserProfile | null): boolean {
    return !!(user?.profileImageUrl && user.profileImageUrl.trim());
  }

  /**
   * Get user initials for avatar fallback
   */
  getUserInitials(user: UserProfile | null): string {
    if (!user?.username) {
      return 'U';
    }
    
    const username = user.username;
    // Get first letter of username
    const firstChar = username.charAt(0).toUpperCase();
    
    // If username has multiple words, get first letter of second word too
    const words = username.split(' ');
    if (words.length > 1 && words[1].length > 0) {
      const secondChar = words[1].charAt(0).toUpperCase();
      return firstChar + secondChar;
    }
    
    return firstChar;
  }

  /**
   * Update local user cache
   */
  updateLocalUser(user: UserProfile): void {
    this.currentUserSubject.next(user);
  }

  /**
   * Clear local user cache
   */
  clearLocalUser(): void {
    this.currentUserSubject.next(null);
  }

  /**
   * Clear all cached user data (for logout or user switch)
   */
  clearAllUserData(): void {
    this.clearLocalUser();
    // Clear any other cached data that might be user-specific
  }

  /**
   * Refresh user data from server
   */
  refreshUserData(): Observable<UserProfile> {
    return this.loadCurrentUser().pipe(
      tap(user => this.updateLocalUser(user))
    );
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { isValid: false, error: 'File size must be less than 5MB' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Please select a valid image file (JPG, PNG, or GIF)' };
    }

    return { isValid: true };
  }

  /**
   * Create image preview URL
   */
  createImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Public creators search (minimal fields)
   */
  searchCreators(query: string, take: number = 20, skip: number = 0): Observable<Array<{ id: number; username: string; profileImageUrl?: string }>> {
    const q = encodeURIComponent(query || '');
    const url = `${this.apiUrl}/users/creators?query=${q}&take=${take}&skip=${skip}`;
    return this.http.get<Array<{ id: number; username: string; profileImageUrl?: string }>>(url).pipe(
      catchError(err => {
        console.error('Error searching creators:', err);
        return of([]);
      })
    );
  }
}
