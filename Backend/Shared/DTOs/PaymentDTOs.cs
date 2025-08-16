using System.ComponentModel.DataAnnotations;

namespace Shared.DTOs
{
    public class AddPaymentMethodRequestDTO
    {
        [Required]
        public string PaymentMethodId { get; set; } = string.Empty;
    }

    public class AddPaymentMethodResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string PaymentMethodId { get; set; } = string.Empty;
    }

    public class PaymentRequestDTO
    {
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public long Amount { get; set; } // Amount in cents

        [Required]
        [StringLength(3, MinimumLength = 3, ErrorMessage = "Currency must be 3 characters")]
        public string Currency { get; set; } = "usd";

        public string? Description { get; set; }
    }

    public class PaymentResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string PaymentIntentId { get; set; } = string.Empty;
        public long Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public decimal RemainingBalance { get; set; }
    }

    public class BalanceResponseDTO
    {
        public decimal CurrentBalance { get; set; }
        public string Currency { get; set; } = "USD";
        public DateTime LastUpdated { get; set; }
    }

    public class PaymentMethodDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public CardInfo Card { get; set; } = new CardInfo();
        public bool IsDefault { get; set; }
        public DateTime Created { get; set; }
    }

    public class CardInfo
    {
        public string Brand { get; set; } = string.Empty;
        public string Last4 { get; set; } = string.Empty;
        public int ExpMonth { get; set; }
        public int ExpYear { get; set; }
        public string Country { get; set; } = string.Empty;
    }

    public class StripeConfigResponseDTO
    {
        public string PublishableKey { get; set; } = string.Empty;
    }
}