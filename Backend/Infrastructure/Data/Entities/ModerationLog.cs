using System;

namespace Raqmiya.Infrastructure
{
    public class ModerationLog
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int AdminId { get; set; }
        public string Action { get; set; } = string.Empty; // e.g., "approved", "rejected"
        public string? Reason { get; set; } // Optional rejection/approval reason
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Navigation
        public Product Product { get; set; } = null!;
        public User Admin { get; set; } = null!;
    }
}
