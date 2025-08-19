namespace Raqmiya.Infrastructure
{
    /// <summary>
    /// Tracks user preferences and interests for personalization
    /// </summary>
    public class UserPreference
    {
        public int Id { get; set; } // Primary Key
        public int UserId { get; set; }
        public int? CategoryId { get; set; } // Preferred category
        public int? TagId { get; set; } // Preferred tag
        public decimal PreferenceScore { get; set; } // 0.0 to 1.0, calculated based on interactions
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public User User { get; set; } = null!;
        public Category? Category { get; set; }
        public Tag? Tag { get; set; }
    }
}
