using System.ComponentModel.DataAnnotations;

namespace Raqmiya.Infrastructure
{
    public class Delivery
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ConversationId { get; set; }
        public Conversation Conversation { get; set; } = null!;

        public Guid? ServiceRequestId { get; set; }
        public ServiceRequest? ServiceRequest { get; set; }

        [Required]
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;

        [Required]
        public decimal Price { get; set; }
        public DeliveryStatus Status { get; set; } = DeliveryStatus.AwaitingPurchase;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
