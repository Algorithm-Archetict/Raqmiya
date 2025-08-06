namespace Shared.DTOs.OrderDTOs
{
    public class OrderDTO
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public List<OrderItemDTO> Items { get; set; } = new();
    }

    public class OrderItemDTO
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }

    public class OrderCreateDTO
    {
        public List<OrderItemCreateDTO> items { get; set; } = new();
        public string paymentMethod { get; set; } = string.Empty;
        public CustomerInfoDTO customerInfo { get; set; } = new();
    }

    public class CustomerInfoDTO
    {
        public string email { get; set; } = string.Empty;
        public string firstName { get; set; } = string.Empty;
        public string lastName { get; set; } = string.Empty;
        public string cardNumber { get; set; } = string.Empty;
        public string expiryDate { get; set; } = string.Empty;
        public string cvv { get; set; } = string.Empty;
        public string billingAddress { get; set; } = string.Empty;
    }

    public class OrderItemCreateDTO
    {
        public int productId { get; set; }
        public int quantity { get; set; }
    }

    public class OrderUpdateDTO
    {
        public int Id { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}

