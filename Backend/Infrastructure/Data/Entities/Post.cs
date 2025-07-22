namespace Raqmiya.Infrastructure
{
    public class Post
    {
        public int Id { get; set; } // Primary Key
        public int CreatorId { get; set; } // Foreign Key to User
        public int? ProductId { get; set; } // Optional: if post is specific to a product's buyers
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime PublishedAt { get; set; }
        public bool IsPublic { get; set; } // True for public announcements, false for product-specific updates

        // Navigation properties
        public User Creator { get; set; } = null!; // Required navigation property
        public Product? Product { get; set; } // Nullable navigation property

    }
}
