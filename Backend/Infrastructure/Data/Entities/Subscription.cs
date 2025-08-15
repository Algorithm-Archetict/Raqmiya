using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Raqmiya.Infrastructure
{
    public class CreatorSubscription
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int FollowerId { get; set; } // User who is following

        [Required]
        public int CreatorId { get; set; } // User being followed

        [Required]
        public DateTime SubscribedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public bool IsActive { get; set; } = true;

        // Navigation properties
        [ForeignKey("FollowerId")]
        public virtual User Follower { get; set; } = null!;

        [ForeignKey("CreatorId")]
        public virtual User Creator { get; set; } = null!;

        // Soft delete properties
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
    }
}
