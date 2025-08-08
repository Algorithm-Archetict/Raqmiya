namespace Shared.DTOs.OrderDTOs
{
    public class PaymentRequestDTO
    {
        public string PaymentMethod { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? TransactionId { get; set; }
        public string? Currency { get; set; } = "USD";
        public string? Notes { get; set; }
    }
}

