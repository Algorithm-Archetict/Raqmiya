// src/app/models/product.model.ts

/**
 * Interface for a product entity (matches backend database schema).
 */
export interface Product {
  id: number;
  creatorId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  productType: string;
  coverImageUrl?: string;
  previewVideoUrl?: string;
  publishedAt?: Date;
  status: string;
  rejectionReason?: string;
  isPublic: boolean;
  permalink: string;
  // Additional fields for display
  creatorUsername?: string;
  averageRating?: number;
  salesCount?: number;
  // Legacy fields for backward compatibility
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  category?: {
    id: number;
    name: string;
  };
  // New fields for form handling
  categoryIds?: number[];
  tagIds?: number[];
}

/**
 * Interface for product creation request payload.
 */
export interface ProductCreateRequest {
  creatorId?: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  productType: string;
  coverImageUrl?: string;
  previewVideoUrl?: string;
  isPublic?: boolean;
  permalink: string;
  categoryIds?: number[];
  tagIds?: number[];
  // File upload fields (for frontend processing)
  digitalProductFile?: File;
  coverImageFile?: File;
  previewVideoFile?: File;
}

/**
 * Interface for product update request payload.
 */
export interface ProductUpdateRequest {
  id?: number;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  productType?: string;
  coverImageUrl?: string;
  previewVideoUrl?: string;
  isPublic?: boolean;
  permalink?: string;
  categoryIds?: number[];
  tagIds?: number[];
  // File upload fields (for frontend processing)
  digitalProductFile?: File;
  coverImageFile?: File;
  previewVideoFile?: File;
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