import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FileUploadResponse {
  id: number;
  name: string;
  fileUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  uploadProductFile(productId: number, file: File): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<FileUploadResponse>(`${this.baseUrl}/Products/${productId}/files`, formData);
  }

  uploadMultipleProductFiles(productId: number, files: File[]): Observable<FileUploadResponse[]> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });
    
    return this.http.post<FileUploadResponse[]>(`${this.baseUrl}/Products/${productId}/files`, formData);
  }

  deleteProductFile(productId: number, fileId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Products/${productId}/files/${fileId}`);
  }

  getProductFiles(productId: number): Observable<FileUploadResponse[]> {
    return this.http.get<FileUploadResponse[]>(`${this.baseUrl}/Products/${productId}/files`);
  }
} 