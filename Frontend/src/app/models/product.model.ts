// src/app/models/product.model.ts

/**
 * Interface for a product entity (matches backend ProductListItemDTO).
 */
export interface Product {
  id: number; // Changed from string to number to match backend
  name: string;
  description?: string; // Added for product card display
  permalink: string;
  price: number;
  originalPrice?: number; // Added for discount display
  currency: string;
  coverImageUrl?: string; // Changed from imageUrl to coverImageUrl
  creatorUsername: string;
  averageRating: number;
  rating?: number; // Added for star rating display
  reviewCount?: number; // Added for review count
  salesCount: number;
  status: string;
  isPublic: boolean;
  publishedAt?: Date;
  category?: { // Added for category display
    id: number;
    name: string;
  };
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
  isPublished?: boolean;
}

/**
 * Interface for product update request payload.
 */
export interface ProductUpdateRequest {
  id: number; // Required for updates
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
 * Interface for a paginated list of products (matches backend PagedResultDTO).
 */
export interface PaginatedProducts {
  items: Product[]; // Changed from products to items
  pageNumber: number; // Changed from currentPage
  pageSize: number; // Changed from itemsPerPage
  totalPages: number;
  totalCount: number; // Changed from totalItems
}