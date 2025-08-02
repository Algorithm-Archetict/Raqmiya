import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../models/auth/auth.model';

@Injectable({
  providedIn: 'root'
})
export class MockAuthService {
  private mockUsers: User[] = [
    {
      id: '1',
      username: 'demoUser',
      email: 'demo@example.com',
      roles: ['Customer']
    },
    {
      id: '2',
      username: 'creator',
      email: 'creator@example.com',
      roles: ['Creator']
    }
  ];

  login(credentials: LoginRequest): Observable<LoginResponse> {
    // Simulate API delay
    return of(this.mockLogin(credentials)).pipe(delay(1000));
  }

  register(userData: RegisterRequest): Observable<any> {
    // Simulate API delay
    return of(this.mockRegister(userData)).pipe(delay(1000));
  }

  private mockLogin(credentials: LoginRequest): LoginResponse {
    // Simple mock logic - accept any login for demo
    const mockUser = this.mockUsers.find(u => 
      u.username === credentials.EmailOrUsername || 
      u.email === credentials.EmailOrUsername
    );

    if (mockUser) {
             return {
         success: true,
         token: 'mock-jwt-token-' + Date.now(),
         username: mockUser.username,
         email: mockUser.email,
         roles: mockUser.roles || []
       };
    } else {
      // Create a new user for demo purposes
      const newUser: User = {
        id: (this.mockUsers.length + 1).toString(),
        username: credentials.EmailOrUsername,
        email: credentials.EmailOrUsername.includes('@') ? credentials.EmailOrUsername : credentials.EmailOrUsername + '@example.com',
        roles: ['Customer']
      };
      
      this.mockUsers.push(newUser);
      
             return {
         success: true,
         token: 'mock-jwt-token-' + Date.now(),
         username: newUser.username,
         email: newUser.email,
         roles: newUser.roles || []
       };
    }
  }

  private mockRegister(userData: RegisterRequest): any {
    // Check if user already exists
    const existingUser = this.mockUsers.find(u => 
      u.username === userData.Username || 
      u.email === userData.Email
    );

    if (existingUser) {
      return {
        success: false,
        message: 'User already exists with this username or email.'
      };
    }

    // Create new user
    const newUser: User = {
      id: (this.mockUsers.length + 1).toString(),
      username: userData.Username,
      email: userData.Email,
      roles: [userData.Role]
    };

    this.mockUsers.push(newUser);

    return {
      success: true,
      message: 'Registration successful! You can now log in.',
      user: newUser
    };
  }
} 