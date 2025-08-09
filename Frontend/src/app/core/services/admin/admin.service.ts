import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AdminUserSummary {
  id: number;
  username: string;
  email: string;
  // Backend returns a single Role string in UserProfileDTO
  role: string;
  isActive: boolean;
  createdAt?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  // Users
  // Backend returns a plain array of users (no paging)
  getUsers(): Observable<AdminUserSummary[]> {
    return this.http.get<AdminUserSummary[]>(`${this.apiUrl}/admin/users`);
  }
  deactivateUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/${userId}/deactivate`, {});
  }
  activateUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/${userId}/activate`, {});
  }
  // Note: updateUserRoles endpoint isn't implemented in backend currently

  // Content moderation (assumed endpoints)
  // Use ProductsController admin endpoints: by-status=Pending
  getFlaggedContent(page = 1, pageSize = 20): Observable<PagedResult<any>> {
    return this.http.get<PagedResult<any>>(
      `${this.apiUrl}/products/admin/by-status`,
      { params: { status: 'Pending', pageNumber: page, pageSize } as any }
    );
  }
  approveContent(contentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/products/admin/${contentId}/approve`, {});
  }
  rejectContent(contentId: number, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/products/admin/${contentId}/reject`, { action: 'reject', reason });
  }

  // Settings
  // Note: no admin settings endpoints exist in backend as of now
}
