// src/app/models/common.model.ts

/**
 * Generic interface for a paginated response from an API.
 * T represents the type of items in the 'data' array.
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
  
  /**
   * Interface for a standard API success response.
   */
  export interface ApiResponse {
    success: boolean;
    message: string;
    data?: any; // Optional: any additional data returned
  }
  
  /**
   * Interface for an API error response.
   */
  export interface ApiErrorResponse {
    statusCode: number;
    message: string;
    errors?: string[]; // Optional: detailed error messages
  }