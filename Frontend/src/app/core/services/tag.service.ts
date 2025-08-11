import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TagDTO } from '../models/product/tag.dto';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private apiUrl = `${environment.apiUrl}/api/products`;

  constructor(private http: HttpClient) {}

  /**
   * Get all available tags
   */
  getAllTags(): Observable<TagDTO[]> {
    return this.http.get<TagDTO[]>(`${this.apiUrl}/tags`);
  }

  /**
   * Get tags for specific categories
   */
  getTagsForCategories(categoryIds: number[]): Observable<TagDTO[]> {
    const params = categoryIds.map(id => `categoryIds=${id}`).join('&');
    return this.http.get<TagDTO[]>(`${this.apiUrl}/tags/by-categories?${params}`);
  }
}
