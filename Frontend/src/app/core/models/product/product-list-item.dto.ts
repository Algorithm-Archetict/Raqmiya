export interface ProductListItemDTO {
  id: number;
  name?: string; // Nullable in backend → optional in frontend
  permalink?: string;
  price: number;
  currency?: string;
  coverImageUrl?: string;
  thumbnailImageUrl?: string;
  creatorUsername?: string;
  averageRating: number;
  salesCount: number;
  status?: string;
  isPublic: boolean;
  publishedAt?: string; // ISO date string (e.g., "2025-08-01T14:30:00Z")
}