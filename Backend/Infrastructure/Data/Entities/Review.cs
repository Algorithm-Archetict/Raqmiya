namespace Raqmiya.Infrastructure
{
    public class Review
    {
        public int Id { get; set; } // Primary Key
        public int ProductId { get; set; } // Foreign Key to Product
        public int UserId { get; set; } // Foreign Key to User
        public int Rating { get; set; } // e.g., 1 to 5
        public string? Comment { get; set; } // Nullable
        public DateTime CreatedAt { get; set; }
        public bool IsApproved { get; set; } // For moderation

        // Navigation properties
        public Product Product { get; set; } = null!; // Required navigation property
        public User User { get; set; } = null!; // Required navigation property

    }
}
