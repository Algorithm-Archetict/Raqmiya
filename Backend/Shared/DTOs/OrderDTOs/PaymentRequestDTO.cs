namespace Shared.DTOs
{
    public class PaymentRequestDTO
    {
        // Add properties as needed
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; }
        public string Currency { get; set; }
        public string TransactionId { get; set; }
        public string PaymentStatus { get; set; }
    }
}
