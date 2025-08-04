using Shared.DTOs.OrderDTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Core.Interfaces
{
    public interface IOrderService
    {
        Task<OrderDTO?> GetOrderByIdAsync(int id);
        Task<List<OrderDTO>> GetOrdersByUserIdAsync(int userId);
        Task<List<OrderDTO>> GetAllOrdersAsync();
        Task<OrderDTO> CreateOrderAsync(int userId, OrderCreateDTO dto);
        Task UpdateOrderStatusAsync(int orderId, string status);
        Task DeleteOrderAsync(int orderId);
    }
}

