import { CategoryDTO } from "./category.dto";
import { FileDTO } from "./file.dto";
import { OfferCodeDTO } from "./offer-code.dto";
import { ReviewDTO } from "./review.dto";
import { TagDTO } from "./tag.dto";
import { VariantDTO } from "./variant.dto";

export interface ProductDetailDTO {
  id: number;
  creatorId: number;
  creatorUsername: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  productType: string;
  coverImageUrl?: string;
  thumbnailImageUrl?: string;
  previewVideoUrl?: string;
  publishedAt?: string;
  status: string;
  isPublic: boolean;
  permalink: string;
  // NEW: Enhanced product details
  features: string[];
  compatibility?: string;
  license?: string;
  updates?: string;
  // Sub-DTOs for nested data
  files: FileDTO[];
  variants: VariantDTO[];
  offerCodes: OfferCodeDTO[];
  reviews: ReviewDTO[];
  category: CategoryDTO;
  tags: TagDTO[];
  wishlistCount: number;
  averageRating: number;
  salesCount: number;
  viewsCount: number;
  isInWishlist: boolean; // Specific to user context

  title: string;
}