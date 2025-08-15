using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Raqmiya.Infrastructure;

namespace Infrastructure.Data.Entities
{
    public class AccountDeletionToken
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(255)]
        public string Token { get; set; } = string.Empty;

        [Required]
        public DateTime ExpiresAt { get; set; }

        [Required]
        public bool IsUsed { get; set; } = false;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Store deletion reason and confirmation data as JSON
        [Column(TypeName = "nvarchar(max)")]
        public string DeletionData { get; set; } = string.Empty;

        // Navigation property
        public User User { get; set; } = null!;
    }
}
