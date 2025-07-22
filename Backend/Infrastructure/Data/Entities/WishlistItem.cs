namespace Raqmiya.Infrastructure
{
    public class WishlistItem
    {
        public int Id { get; set; } // Primary Key
        public int UserId { get; set; }
        public int ProductId { get; set; }
        public DateTime AddedAt { get; set; }

        // Navigation properties
        public User User { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }
}
