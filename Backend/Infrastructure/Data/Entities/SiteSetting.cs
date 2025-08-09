using System;

namespace Raqmiya.Infrastructure
{
    public class SiteSetting
    {
        public int Id { get; set; }
        public string SiteName { get; set; } = string.Empty;
        public string SupportEmail { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
