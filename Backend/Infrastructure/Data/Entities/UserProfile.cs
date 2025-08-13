namespace Raqmiya.Infrastructure
{
    /// <summary>
    /// Extended user profile for personalization
    /// </summary>
    public class UserProfile
    {
        public int Id { get; set; } // Primary Key
        public int UserId { get; set; }
        
        // Professional Information
        public string? Profession { get; set; } // Designer, Developer, Marketer, etc.
        public string? Industry { get; set; } // Gaming, Web Design, Mobile Apps, etc.
        public ExperienceLevel? ExperienceLevel { get; set; }
        
        // Preferences
        public decimal? PreferredPriceRangeMin { get; set; }
        public decimal? PreferredPriceRangeMax { get; set; }
        public string? PreferredStyle { get; set; } // Modern, Vintage, Minimal, etc.
        public string? PreferredFormats { get; set; } // JSON array: ["PSD", "Sketch", "Figma"]
        
        // Behavior Patterns
        public int TotalPurchases { get; set; } = 0;
        public decimal TotalSpent { get; set; } = 0;
        public int TotalWishlistItems { get; set; } = 0;
        public int TotalProductViews { get; set; } = 0;
        public DateTime? LastActiveAt { get; set; }
        
        // Calculated Scores
        public decimal PersonalizationScore { get; set; } = 0; // 0-100, higher = more data available
        public decimal EngagementScore { get; set; } = 0; // 0-100, based on recent activity
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public User User { get; set; } = null!;
    }

    public enum ExperienceLevel
    {
        Beginner = 1,
        Intermediate = 2,
        Advanced = 3,
        Expert = 4
    }
}
