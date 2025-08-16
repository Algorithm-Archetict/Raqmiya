using System.ComponentModel.DataAnnotations;
using Raqmiya.Infrastructure;

namespace Infrastructure.Data.Entities
{
    public class PasswordResetToken
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Token { get; set; } = string.Empty;
        
        [Required]
        public int UserId { get; set; }
        
        [Required]
        public DateTime ExpiresAt { get; set; }
        
        [Required]
        public bool IsUsed { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation property
        public virtual User User { get; set; } = null!;
    }
}
