namespace Shared.DTOs.Messaging
{
    public class ConversationDto
    {
        public Guid Id { get; set; }
        public int CreatorId { get; set; }
        public int CustomerId { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTime CreatedAt { get; set; }
        public DateTime? LastMessageAt { get; set; }
    }
}
