using System.ComponentModel.DataAnnotations;

namespace Raqmiya.Infrastructure
{
    public class ServiceRequest
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ConversationId { get; set; }
        public Conversation Conversation { get; set; } = null!;

        [Required]
        public int RequestedByCustomerId { get; set; }
        public User RequestedByCustomer { get; set; } = null!;

        [Required]
        public string Requirements { get; set; } = string.Empty;

        public decimal? ProposedBudget { get; set; }
        public string? Currency { get; set; } = "USD";
        public ServiceRequestStatus Status { get; set; } = ServiceRequestStatus.Pending;
        public DateTime? CreatorDeadlineUtc { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
