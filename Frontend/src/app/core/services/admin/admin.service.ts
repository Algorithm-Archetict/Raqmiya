import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AdminUserSummary {
  id: number;
  username: string;
  email: string;
  roles: string[];
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
  getUsers(page = 1, pageSize = 20): Observable<PagedResult<AdminUserSummary>> {
    return this.http.get<PagedResult<AdminUserSummary>>(`${this.apiUrl}/admin/users`, { params: { page, pageSize } as any });
  }
  deactivateUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/${userId}/deactivate`, {});
  }
  activateUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/${userId}/activate`, {});
  }
  updateUserRoles(userId: number, roles: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/users/${userId}/roles`, { roles });
  }

  // Content moderation (assumed endpoints)
  getFlaggedContent(page = 1, pageSize = 20): Observable<PagedResult<any>> {
    return this.http.get<PagedResult<any>>(`${this.apiUrl}/admin/content/flagged`, { params: { page, pageSize } as any });
  }
  approveContent(contentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/content/${contentId}/approve`, {});
  }
  rejectContent(contentId: number, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/content/${contentId}/reject`, { reason });
  }

  // Settings
  getSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/settings`);
  }
  updateSettings(payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/settings`, payload);
  }
}
