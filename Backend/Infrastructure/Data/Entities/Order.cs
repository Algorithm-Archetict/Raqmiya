using System.ComponentModel;

namespace Raqmiya.Infrastructure
{
    public class Order
    {
        public int Id { get; set; } // Primary Key
        public int? BuyerId { get; set; } // Foreign Key to User (nullable for guest checkouts)
        public int ProductId { get; set; } // Foreign Key to Product (assuming one product per order for simplicity)
        public decimal PricePaid { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty; // From payment gateway
        public string PaymentStatus { get; set; } = string.Empty; // e.g., "pending", "completed", "refunded", "failed"
        public DateTime OrderedAt { get; set; }
        public string? GuestEmail { get; set; } // Email for guest checkouts

        // Navigation properties
        public User? Buyer { get; set; } // Nullable navigation property
        public Product Product { get; set; } = null!; // Required navigation property
        public License? License { get; set; } // One-to-one with License

        // midas added
        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
        public ICollection<License> Licenses { get; set; } = new List<License>();
    }
}
