namespace Shared.DTOs.ProductDTOs
{
    public class ProductDetailDTO
    {
        public int Id { get; set; }
        public int CreatorId { get; set; }
        public string CreatorUsername { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string ProductType { get; set; } = string.Empty;
        public string? CoverImageUrl { get; set; }
        public string? ThumbnailImageUrl { get; set; }
        public string? PreviewVideoUrl { get; set; }
        public DateTime? PublishedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsPublic { get; set; }
        public string Permalink { get; set; } = string.Empty;

        // NEW: Enhanced product details
        public List<string> Features { get; set; } = new List<string>();
        public string? Compatibility { get; set; }
        public string? License { get; set; }
        public string? Updates { get; set; }

        // Sub-DTOs for nested data
        public List<FileDTO> Files { get; set; } = new List<FileDTO>();
        public List<VariantDTO> Variants { get; set; } = new List<VariantDTO>();
        public List<OfferCodeDTO> OfferCodes { get; set; } = new List<OfferCodeDTO>();
        public List<ReviewDTO> Reviews { get; set; } = new List<ReviewDTO>();
        public List<ProductCategoryDTO> Categories { get; set; } = new List<ProductCategoryDTO>();
        public List<TagDTO> Tags { get; set; } = new List<TagDTO>();

        public int WishlistCount { get; set; }
        public double AverageRating { get; set; }
        public int SalesCount { get; set; }
        public int ViewsCount { get; set; }
        public bool IsInWishlist { get; set; } // Specific to user context
    }
}
