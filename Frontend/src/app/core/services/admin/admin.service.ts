import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
    return this.http.get<any[]>(`${this.apiUrl}/admin/users`).pipe(
      map(list => (Array.isArray(list) ? list : [])
        .map(u => ({
          id: u.id ?? u.Id,
          username: u.username ?? u.Username,
          email: u.email ?? u.Email,
          role: u.role ?? u.Role,
          isActive: (u.isActive ?? u.IsActive) ?? false,
          createdAt: u.createdAt ?? u.CreatedAt
        }) as AdminUserSummary))
    );
  }
  deactivateUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/${userId}/deactivate`, {}, { responseType: 'text' as 'json' });
  }
  activateUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/${userId}/activate`, {}, { responseType: 'text' as 'json' });
  }
  // Note: updateUserRoles endpoint isn't implemented in backend currently

  // Content moderation (assumed endpoints)
  // Use ProductsController admin endpoints: by-status=Pending
  getFlaggedContent(page = 1, pageSize = 20): Observable<PagedResult<any>> {
    return this.http.get<any>(
      `${this.apiUrl}/products/admin/by-status`,
      { params: { status: 'Pending', pageNumber: page, pageSize } as any }
    ).pipe(
      map(res => {
        if (Array.isArray(res)) {
          return { items: res, total: res.length } as PagedResult<any>;
        }
        const items = res?.items ?? res?.Items ?? [];
        const total = res?.total ?? res?.Total ?? res?.totalCount ?? res?.TotalCount ?? items.length;
        return { items, total } as PagedResult<any>;
      })
    );
  }
  approveContent(contentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/products/admin/${contentId}/approve`, {});
  }
  rejectContent(contentId: number, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/products/admin/${contentId}/reject`, { action: 'reject', reason });
  }

  // Settings
  getSettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/settings`).pipe(
      map(s => ({
        siteName: s?.siteName ?? s?.SiteName ?? '',
        supportEmail: s?.supportEmail ?? s?.SupportEmail ?? '',
      }))
    );
  }
  updateSettings(payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/settings`, payload);
  }
}
