// src/app/features/auth/services/user-management.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UserProfile, UserProfileUpdateRequest } from '../../../models/user.model'; // Import models

@Injectable({
  providedIn: 'root' // Available globally, or could be scoped if needed
})
export class UserManagementService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/users/${userId}/profile`);
  }

  updateUserProfile(userId: string, data: UserProfileUpdateRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/users/${userId}/profile`, data);
  }

  // Add more user management methods as needed (e.g., change password, deactivate account)
}