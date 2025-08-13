using System;
using System.ComponentModel.DataAnnotations;

namespace Raqmiya.Infrastructure
{
    public class PaymentMethodBalance
    {
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        [Required]
        public string PaymentMethodId { get; set; } = string.Empty;
        
        [Required]
        public decimal Balance { get; set; }
        
        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "USD";
        
        [Required]
        public bool IsSelected { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public string CardBrand { get; set; } = string.Empty;
        public string CardLast4 { get; set; } = string.Empty;
    }
}






