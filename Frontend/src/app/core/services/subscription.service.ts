import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SubscribeRequest,
  SubscribeResponse,
  UnsubscribeRequest,
  UnsubscribeResponse,
  CreatorProfile,
  SubscriptionStatus,
  Follower,
  CreatorFollowersResponse
} from '../models/subscription/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  subscribe(creatorId: number): Observable<SubscribeResponse> {
    const request: SubscribeRequest = { creatorId };
    return this.http.post<SubscribeResponse>(`${this.apiUrl}/subscription/subscribe`, request);
  }

  unsubscribe(creatorId: number): Observable<UnsubscribeResponse> {
    const request: UnsubscribeRequest = { creatorId };
    return this.http.post<UnsubscribeResponse>(`${this.apiUrl}/subscription/unsubscribe`, request);
  }

  getCreatorProfile(creatorId: number): Observable<CreatorProfile> {
    return this.http.get<CreatorProfile>(`${this.apiUrl}/subscription/creator/${creatorId}`);
  }

  getSubscriptionStatus(creatorId: number): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(`${this.apiUrl}/subscription/status/${creatorId}`);
  }

  getCreatorFollowers(creatorId: number, page: number = 1, pageSize: number = 20): Observable<Follower[]> {
    return this.http.get<Follower[]>(`${this.apiUrl}/subscription/creator/${creatorId}/followers?page=${page}&pageSize=${pageSize}`);
  }

  getFollowingCreators(page: number = 1, pageSize: number = 20): Observable<CreatorProfile[]> {
    return this.http.get<CreatorProfile[]>(`${this.apiUrl}/subscription/following?page=${page}&pageSize=${pageSize}`);
  }

  getFollowerCount(creatorId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/subscription/creator/${creatorId}/follower-count`);
  }

  getFollowingCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/subscription/following-count`);
  }
}
