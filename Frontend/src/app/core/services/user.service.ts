// src/app/core/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserProfileDTO } from '../models/user/user-profile.dto';
import { UserUpdateDTO } from '../models/user/user-update.dto';
import { ChangePasswordDTO } from '../models/user/change-password.dto';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = 'http://localhost:5255/api/Users';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfileDTO> {
    return this.http.get<UserProfileDTO>(`${this.baseUrl}/me`);
  }

  updateProfile(data: UserUpdateDTO): Observable<any> {
    return this.http.put(`${this.baseUrl}/me`, data);
  }

  changePassword(data: ChangePasswordDTO): Observable<any> {
    return this.http.post(`${this.baseUrl}/me/change-password`, data);
  }

  // Optional: assuming there's a file upload endpoint returning a URL
//   uploadProfileImage(){} can we handle this and make the user upload the image to the server and then return the url to the user and save it to the wwwroot
// curl -X 'PUT' \
//   'http://localhost:5255/api/Users/me' \
//   -H 'accept: text/plain' \
//   -H 'Content-Type: application/json' \
//   -d '{
//   "username": "string",
//   "profileDescription": "string",
//   "profileImageUrl": "string"
// }'
// Request URL
// http://localhost:5255/api/Users/me
}
