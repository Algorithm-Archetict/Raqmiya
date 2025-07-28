// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'; // Assuming you have an environments setup

@Injectable({
  providedIn: 'root' // Makes this service available globally
})
export class ApiService {
  private apiUrl = environment.apiUrl; // Base URL for your API

  constructor(private http: HttpClient) {}

  private formatErrors(error: any): Observable<never> {
    // Implement more robust error handling if needed
    console.error('API Error:', error);
    throw error; // Re-throw the error for component-level handling
  }

  get<T>(path: string, params: HttpParams = new HttpParams()): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${path}`, { params });
  }

  post<T>(path: string, body: Object = {}): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${path}`, body);
  }

  put<T>(path: string, body: Object = {}): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${path}`, body);
  }

  delete<T>(path: string, params: HttpParams = new HttpParams()): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${path}`, { params });
  }
}
