namespace Shared.DTOs.ProductDTOs
{
    // --- Response DTOs (for sending data to the client) ---

    public class ProductListItemDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Permalink { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string? CoverImageUrl { get; set; }
        public string? ThumbnailImageUrl { get; set; }
        public string CreatorUsername { get; set; } = string.Empty;
        public int? CreatorId { get; set; }
        public double AverageRating { get; set; }
        public int SalesCount { get; set; }
        public string Status { get; set; } = string.Empty; // Useful for creator's view
        public bool IsPublic { get; set; }
        public DateTime? PublishedAt { get; set; }
        public bool IsCreatorDeleted { get; set; } = false; // Indicates if the creator's account is soft-deleted
        public bool UserHasPurchased { get; set; } = false; // Indicates if the current user has purchased this product
    }
}
