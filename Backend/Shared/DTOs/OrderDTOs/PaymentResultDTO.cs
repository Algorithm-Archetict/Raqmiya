namespace Shared.DTOs
{
    public class PaymentResultDTO
    {
        // Add properties as needed
        public bool Success { get; set; }
        public string Message { get; set; }
        public string TransactionId { get; set; }
        public string PaymentStatus { get; set; }
    }
}
