using System.ComponentModel.DataAnnotations;

namespace Raqmiya.Infrastructure
{
    public class Message
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ConversationId { get; set; }
        public Conversation Conversation { get; set; } = null!;

        [Required]
        public int SenderId { get; set; }
        public User Sender { get; set; } = null!;

        public string? Body { get; set; }
        public MessageType Type { get; set; } = MessageType.Text;

        // Optional attachment for this message (e.g., image URL)
        public string? AttachmentUrl { get; set; }
        // Optional attachment type hint (e.g., "image", "file", mime type)
        public string? AttachmentType { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
