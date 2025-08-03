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
        public List<OrderItemCreateDTO> Items { get; set; } = new();
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

