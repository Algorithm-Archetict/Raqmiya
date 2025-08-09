using System;
using System.Collections.Generic;

namespace Raqmiya.Infrastructure
{
    public class CustomerInfo
    {
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Country { get; set; }
        public string? ZipCode { get; set; }
    }

    public class Order
    {
        public int Id { get; set; }
        public int BuyerId { get; set; } // Foreign key to User
        public User Buyer { get; set; } = null!; // Navigation property
        public DateTime OrderedAt { get; set; } = DateTime.UtcNow; // When the order was placed
        public DateTime? UpdatedAt { get; set; }
        public string Status { get; set; } = "Pending";
        public decimal TotalAmount { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Discount { get; set; }
        public decimal Total { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty;
        public CustomerInfo CustomerInfo { get; set; } = new CustomerInfo();
        public List<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
        public List<License> Licenses { get; set; } = new List<License>();
    }

   
}
