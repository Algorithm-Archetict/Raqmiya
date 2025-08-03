using System;
using System.Collections.Generic;

namespace Raqmiya.Infrastructure
{
    public class Order
    {
        public int Id { get; set; }
        public int BuyerId { get; set; } // Foreign key to User
        public User Buyer { get; set; } = null!; // Navigation property
        public DateTime OrderedAt { get; set; } = DateTime.UtcNow; // When the order was placed
        public DateTime? UpdatedAt { get; set; }
        public string Status { get; set; } = "Pending";
        public decimal TotalAmount { get; set; }
        public List<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
        public List<License> Licenses { get; set; } = new List<License>();
    }

   
}
