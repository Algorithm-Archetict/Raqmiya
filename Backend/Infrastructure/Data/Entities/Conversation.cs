using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Raqmiya.Infrastructure
{
    public class Conversation
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public int CreatorId { get; set; }
        public User Creator { get; set; } = null!;

        [Required]
        public int CustomerId { get; set; }
        public User Customer { get; set; } = null!;

        public ConversationStatus Status { get; set; } = ConversationStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastMessageAt { get; set; }

        public ICollection<Message> Messages { get; set; } = new List<Message>();
        public MessageRequest? MessageRequest { get; set; }
        public ICollection<ServiceRequest> ServiceRequests { get; set; } = new List<ServiceRequest>();
        public ICollection<Delivery> Deliveries { get; set; } = new List<Delivery>();
    }
}
