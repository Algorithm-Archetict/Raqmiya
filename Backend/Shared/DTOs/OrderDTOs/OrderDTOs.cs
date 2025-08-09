namespace Shared.DTOs.OrderDTOs
{
    public class OrderDTO
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public List<OrderItemDTO> Items { get; set; } = new();
        public decimal Subtotal { get; set; }
        public decimal Discount { get; set; }
        public decimal Total { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public CustomerInfoDTO CustomerInfo { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class OrderItemDTO
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Currency { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }

    public class OrderCreateDTO
    {
        public List<OrderItemCreateDTO> Items { get; set; } = new();
        public string PaymentMethod { get; set; } = string.Empty;
        public CustomerInfoDTO CustomerInfo { get; set; } = new();
    }

    public class CustomerInfoDTO
    {
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Country { get; set; }
        public string? ZipCode { get; set; }
        // Removed sensitive fields: cardNumber, expiryDate, cvv, billingAddress
    }

    public class OrderItemCreateDTO
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class OrderUpdateDTO
    {
        public int Id { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
