using System;
using System.Collections.Generic;

namespace Shared.DTOs.OrderDTOs
{
    public class CartItemDTO
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Currency { get; set; } = "USD";
        public string Creator { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public int Quantity { get; set; } = 1;
    }

    public class CartDTO
    {
        public string Id { get; set; } = string.Empty;
        public int UserId { get; set; }
        public List<CartItemDTO> Items { get; set; } = new List<CartItemDTO>();
        public decimal Subtotal { get; set; }
        public decimal Discount { get; set; }
        public decimal Total { get; set; }
        public string Currency { get; set; } = "USD";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CartResponseDTO
    {
        public bool Success { get; set; }
        public CartDTO Cart { get; set; } = new CartDTO();
        public string? Message { get; set; }
    }

    public class AddToCartRequestDTO
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; } = 1;
    }

    public class RemoveFromCartRequestDTO
    {
        public int ProductId { get; set; }
    }

    public class UpdateCartItemRequestDTO
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }
} 