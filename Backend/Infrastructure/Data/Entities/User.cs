//using Microsoft.Extensions.Hosting;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Raqmiya.Infrastructure
{
    public class User
    {
        public int Id { get; set; } 
        public string Email { get; set; } = string.Empty;

        [Display(Name = "Password")]
        [DataType(DataType.Password)]
        public string HashedPassword { get; set; } = string.Empty;
        public string Salt { get; set; } = string.Empty;

        public string Username { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // Use UTC for consistency
        public DateTime? LastLogin { get; set; } // Nullable

        // public bool IsCreator { get; set; }
        public string Role { get; set; } = "User"; // Default role, can be "User", "Creator", or "Admin"
        public string? ProfileDescription { get; set; } // Nullable
        public string? ProfileImageUrl { get; set; } // Nullable
        public string? StripeConnectAccountId { get; set; } // Nullable, for creators
        public string? PayoutSettings { get; set; } // Store as JSON string or complex type, nullable

        public bool IsActive { get; set; } = true; // Indicates if the user account is active

        // Navigation properties
        public ICollection<Product> Products { get; set; } = new List<Product>();
        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
        public ICollection<Post> Posts { get; set; } = new List<Post>();
        public ICollection<WishlistItem> WishlistItems { get; set; } = new List<WishlistItem>();
        public ICollection<ProductView> ProductViews { get; set; } = new List<ProductView>();
        public ICollection<License> Licenses { get; set; } = new List<License>();
        
        // Navigation properties for personalization
        public ICollection<UserInteraction> UserInteractions { get; set; } = new List<UserInteraction>();
        public ICollection<UserPreference> UserPreferences { get; set; } = new List<UserPreference>();
    }
}
