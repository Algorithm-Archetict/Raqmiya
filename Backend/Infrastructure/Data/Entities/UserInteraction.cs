namespace Raqmiya.Infrastructure
{
    /// <summary>
    /// Tracks detailed user interactions for better personalization
    /// </summary>
    public class UserInteraction
    {
        public int Id { get; set; } // Primary Key
        public int UserId { get; set; }
        public int ProductId { get; set; }
        public InteractionType Type { get; set; }
        public decimal Weight { get; set; } // Interaction weight for scoring
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? Metadata { get; set; } // JSON for additional context (e.g., time spent viewing)

        // Navigation properties
        public User User { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }

    public enum InteractionType
    {
        View = 1,           // Weight: 1.0
        Wishlist = 2,       // Weight: 2.0
        Purchase = 3,       // Weight: 5.0
        Review = 4,         // Weight: 3.0
        Download = 5,       // Weight: 4.0
        Share = 6,          // Weight: 1.5
        Search = 7          // Weight: 0.5
    }
}
