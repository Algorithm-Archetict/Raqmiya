using System;

namespace Raqmiya.Infrastructure
{
    public class PlatformSetting
    {
        public int Id { get; set; }
        public string Key { get; set; } = string.Empty;
        // Decimal value used for numeric settings (e.g., commission percentage stored as 0.10 = 10%)
        public decimal DecimalValue { get; set; }
        public string? StringValue { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
