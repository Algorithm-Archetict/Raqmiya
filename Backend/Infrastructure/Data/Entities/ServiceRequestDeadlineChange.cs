using System;

namespace Raqmiya.Infrastructure
{
    public enum DeadlineChangeStatus
    {
        Pending = 0,
        Accepted = 1,
        Declined = 2
    }

    public class ServiceRequestDeadlineChange
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ServiceRequestId { get; set; }
        public int ProposedByCreatorId { get; set; }
        public DateTime ProposedDeadlineUtc { get; set; }
        public string? Reason { get; set; }
        public DeadlineChangeStatus Status { get; set; } = DeadlineChangeStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
