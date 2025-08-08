namespace Shared.DTOs.OrderDTOs
{
    public class PaymentResultDTO
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? TransactionId { get; set; }
        public string? PaymentStatus { get; set; }
    }
}

