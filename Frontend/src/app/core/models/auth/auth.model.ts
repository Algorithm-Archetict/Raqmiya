// src/app/models/auth.model.ts

/**
 * Interface for user login request payload.
 */
export interface LoginRequest {
  EmailOrUsername: string;
  Password: string;
}

/**
 * Interface for user login response payload.
 */
export interface LoginResponse {
  success: boolean;
  token: string;
  message?: string;
  username?: string;
  email?: string;
  roles: string[];
}

/**
 * Interface for user registration request payload.
 */
export interface RegisterRequest {
  Email: string;
  Username: string;
  Password: string;
  Role: string; // Required, not optional
}

/**
 * Basic user interface, typically received after login/registration or from user profile API.
 */
export interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
  roles?: string[];
  profileImageUrl?: string | null; // Profile image URL from backend
  profileDescription?: string;
  createdAt?: Date;
  isActive?: boolean;
}