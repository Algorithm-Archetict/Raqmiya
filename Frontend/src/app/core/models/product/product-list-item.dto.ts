export interface ProductListItemDTO {
  id: number;
  name?: string; // Nullable in backend → optional in frontend
  permalink?: string;
  price: number;
  currency?: string;
  coverImageUrl?: string;
  thumbnailImageUrl?: string;
  creatorUsername?: string;
  creatorId?: number; // Add creator ID for comparison
  averageRating: number;
  salesCount: number;
  status?: string;
  isPublic: boolean;
  publishedAt?: string; // ISO date string (e.g., "2025-08-01T14:30:00Z")
  isCreatorDeleted?: boolean; // Indicates if the creator's account is soft-deleted
  userHasPurchased?: boolean; // Indicates if the current user has purchased this product
}