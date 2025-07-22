namespace Raqmiya.Infrastructure
{
    public class ProductView
    {
        public int Id { get; set; } // Primary Key
        public int ProductId { get; set; }
        public int? UserId { get; set; } // Nullable for guest views
        public DateTime ViewedAt { get; set; }
        public string? IpAddress { get; set; } // Optional, for analytics/abuse prevention

        // Navigation properties
        public Product Product { get; set; } = null!;
        public User? User { get; set; } // Nullable navigation property
    }
}
