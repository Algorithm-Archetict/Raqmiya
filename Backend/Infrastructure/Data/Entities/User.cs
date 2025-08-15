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

        // Test card information for development/testing purposes
        public string? TestCardNumber { get; set; } // Nullable, stores the assigned test card number
        public string? TestCardType { get; set; } // Nullable, stores the card type (visa, mastercard, etc.)
        public string? TestCardDescription { get; set; } // Nullable, stores the expected result (success, declined, error)

        public bool IsActive { get; set; } = true; // Indicates if the user account is active

        // Soft Delete Properties
        public bool IsDeleted { get; set; } = false; // Indicates if the user account is soft deleted
        public DateTime? DeletedAt { get; set; } // When the account was soft deleted
        public string? DeletionReason { get; set; } // Reason for deletion (optional)
        public DateTime? DeletionScheduledAt { get; set; } // When the account will be permanently deleted (30 days after soft delete)

        // Navigation properties
        public ICollection<Product> Products { get; set; } = new List<Product>();
        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();

        public ICollection<Post> Posts { get; set; } = new List<Post>();
        public ICollection<WishlistItem> WishlistItems { get; set; } = new List<WishlistItem>();
        public ICollection<ProductView> ProductViews { get; set; } = new List<ProductView>();
        public ICollection<License> Licenses { get; set; } = new List<License>();
        public string? StripeCustomerId { get; set; } // Stores Stripe customer ID
        public List<PaymentMethodBalance> PaymentMethodBalances { get; set; } = new List<PaymentMethodBalance>();
    }
}