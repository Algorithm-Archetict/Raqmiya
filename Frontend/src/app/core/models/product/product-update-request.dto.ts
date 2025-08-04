export interface ProductUpdateRequestDTO {
  id: number; // Required for update
  name: string; // Required, minLength: 3, maxLength: 200
  description?: string; // Optional, maxLength: 5000
  price: number; // Required, min: 0.01, max: 1,000,000
  currency: string; // Required, exactly 3 characters
  productType: string; // Required, maxLength: 50
  coverImageUrl?: string; // Optional, URI, maxLength: 500
  thumbnailImageUrl?: string; // Optional, URI, maxLength: 500
  previewVideoUrl?: string; // Optional, URI, maxLength: 500
  isPublic: boolean; // Required
  permalink: string; // Required, pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$
  // NEW: Enhanced product details
  features?: string[]; // Optional, will be serialized to JSON string
  compatibility?: string; // Optional, maxLength: 500
  license?: string; // Optional, maxLength: 100
  updates?: string; // Optional, maxLength: 100
  categoryIds?: number[]; // Optional
  tagIds?: number[]; // Optional
  status: string; // Required, maxLength: 50
}