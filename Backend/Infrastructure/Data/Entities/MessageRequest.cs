using System.ComponentModel.DataAnnotations;

namespace Raqmiya.Infrastructure
{
    public class MessageRequest
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
        public string FirstMessageText { get; set; } = string.Empty;

        public MessageRequestStatus Status { get; set; } = MessageRequestStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
