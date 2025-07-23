// src/app/models/auth.model.ts

/**
 * Interface for user login request payload.
 */
export interface LoginRequest {
    email: string;
    password: string;
  }
  
  /**
   * Interface for user login response payload.
   */
  export interface LoginResponse {
    token: string;
    // refreshToken?: string; // Optional: if your API provides a refresh token
    user: User; // Basic user info
    message?: string; // Optional: A success message from the backend
  }
  
  /**
   * Interface for user registration request payload.
   */
  export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    // Add other registration fields as needed, e.g., fullName, address
  }
  
  /**
   * Basic user interface, typically received after login/registration or from user profile API.
   */
  export interface User {
    id: string;
    username: string;
    email: string;
    // Add other user properties as needed, e.g., roles, profilePicture, createdAt
  }