// src/app/models/product.model.ts

/**
 * Interface for a product entity.
 */
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    imageUrl?: string; // Optional: URL to product image
    creatorId: string; // ID of the user who created the product
    creatorUsername?: string; // Optional: Creator's username for display
    category?: string; // Optional: Product category
    stock?: number; // Optional: Available stock
    isPublished: boolean; // Whether the product is visible to others
    createdAt: Date;
    updatedAt: Date;
    // Add other product properties as needed, e.g., tags, reviews, ratings
  }
  
  /**
   * Interface for product creation request payload.
   */
  export interface ProductCreateRequest {
    name: string;
    description: string;
    price: number;
    currency: string;
    imageUrl?: string;
    category?: string;
    stock?: number;
    isPublished?: boolean; // Can be optional if default is handled by backend
  }
  
  /**
   * Interface for product update request payload.
   */
  export interface ProductUpdateRequest {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    imageUrl?: string;
    category?: string;
    stock?: number;
    isPublished?: boolean;
  }
  
  /**
   * Interface for a paginated list of products.
   */
  export interface PaginatedProducts {
    products: Product[];
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  }