namespace Raqmiya.Infrastructure
{
    public class OfferCode
    {
        public int Id { get; set; } // Primary Key
        public int? ProductId { get; set; } // Nullable: if null, applies store-wide for creator
        public string Code { get; set; } = string.Empty; // The actual discount code
        public string DiscountType { get; set; } = "percentage"; // "percentage", "fixed_amount"
        public decimal DiscountValue { get; set; }
        public int? UsageLimit { get; set; } // Nullable for unlimited
        public int TimesUsed { get; set; }
        public DateTime StartsAt { get; set; }
        public DateTime? ExpiresAt { get; set; } // Nullable for no expiration

        // Navigation property
        public Product? Product { get; set; } // Nullable navigation property

    }
}
