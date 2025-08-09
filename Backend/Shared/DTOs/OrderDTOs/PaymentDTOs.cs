namespace Shared.DTOs.OrderDTOs
{
    public class PaymentRequestDTO
    {
        public string PaymentMethod { get; set; } = string.Empty;
        public string PaymentToken { get; set; } = string.Empty;
        public string Currency { get; set; } = "USD";
        public decimal Amount { get; set; }
        public bool SaveCard { get; set; } = false;
    }

    public class PaymentResultDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
    }
}
