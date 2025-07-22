namespace Raqmiya.Infrastructure
{
    public class License
    {
        public int Id { get; set; } // Primary Key
        public int OrderId { get; set; } // Foreign Key to Order (one-to-one)
        public int ProductId { get; set; } // Foreign Key to Product
        public int BuyerId { get; set; } // Foreign Key to User

        public string? LicenseKey { get; set; } // Nullable, for software licenses etc.
        public DateTime AccessGrantedAt { get; set; }
        public DateTime? ExpiresAt { get; set; } // Nullable, for time-limited access or subscriptions
        public string Status { get; set; } = "active"; // e.g., "active", "revoked", "expired"

        // Navigation properties
        public Order Order { get; set; } = null!; // Required navigation property
        public Product Product { get; set; } = null!; // Required navigation property
        public User Buyer { get; set; } = null!; // Required navigation property

    }
}
