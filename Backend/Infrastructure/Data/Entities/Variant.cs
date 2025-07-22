namespace Raqmiya.Infrastructure
{
    public class Variant
    {
        public int Id { get; set; } // Primary Key
        public int ProductId { get; set; } // Foreign Key to Product
        public string Name { get; set; } = string.Empty;
        public decimal PriceAdjustment { get; set; } // Could be positive or negative
        public string? Description { get; set; } // Nullable

        // Navigation property
        public Product Product { get; set; } = null!; // Required navigation property

    }
}
