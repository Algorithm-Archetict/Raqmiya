using System;

namespace Raqmiya.Infrastructure
{
    public class PlatformCommission
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public int OrderItemId { get; set; }
        public int ProductId { get; set; }
        public int CreatorId { get; set; }
        public decimal CommissionAmount { get; set; }
        public string CommissionCurrency { get; set; } = "USD";
        public decimal CommissionUsd { get; set; }
        public decimal PercentageApplied { get; set; } = 0.10m;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


