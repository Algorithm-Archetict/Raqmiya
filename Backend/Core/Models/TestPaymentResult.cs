namespace Core.Models
{
    public class TestPaymentResult
    {
        public bool Success { get; set; }
        public string PaymentIntentId { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
    }
}
