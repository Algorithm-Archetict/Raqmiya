export interface ProductCreateRequestDTO {
  name: string; // Required, minLength: 3, maxLength: 200
  description?: string; // Optional, maxLength: 5000
  price: number; // Required, min: 0.01, max: 1,000,000
  currency: string; // Required, exactly 3 characters
  productType: string; // Required, maxLength: 50
  coverImageUrl?: string; // Optional, URI, maxLength: 500
  previewVideoUrl?: string; // Optional, URI, maxLength: 500
  isPublic: boolean; // Required
  permalink: string; // Required, pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$
  categoryIds?: number[]; // Optional
  tagIds?: number[]; // Optional
}