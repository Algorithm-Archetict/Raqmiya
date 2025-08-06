using Core.Interfaces;
using Raqmiya.Infrastructure;
using Shared.DTOs.OrderDTOs;
using AutoMapper;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace Core.Services
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IMapper _mapper;
        public OrderService(IOrderRepository orderRepository, IMapper mapper)
        {
            _orderRepository = orderRepository;
            _mapper = mapper;
        }

        public async Task<OrderDTO?> GetOrderByIdAsync(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            return order == null ? null : _mapper.Map<OrderDTO>(order);
        }

        public async Task<List<OrderDTO>> GetOrdersByUserIdAsync(int userId)
        {
            var orders = await _orderRepository.GetByUserIdAsync(userId);
            return _mapper.Map<List<OrderDTO>>(orders);
        }

        public async Task<List<OrderDTO>> GetAllOrdersAsync()
        {
            var orders = await _orderRepository.GetAllAsync();
            return _mapper.Map<List<OrderDTO>>(orders);
        }

        public async Task<OrderDTO> CreateOrderAsync(int userId, OrderCreateDTO dto)
        {
            var order = new Order
            {
                BuyerId = userId,
                OrderedAt = DateTime.UtcNow,
                Status = "Pending",
                OrderItems = _mapper.Map<List<OrderItem>>(dto.Items)
            };
            order.TotalAmount = order.OrderItems.Sum(i => i.UnitPrice * i.Quantity);
            await _orderRepository.AddAsync(order);

            // Generate a permanent license for each product in the order
            foreach (var item in order.OrderItems)
            {
                var license = new License
                {
                    OrderId = order.Id,
                    ProductId = item.ProductId,
                    BuyerId = userId,
                    LicenseKey = Guid.NewGuid().ToString(),
                    AccessGrantedAt = DateTime.UtcNow,
                    ExpiresAt = null, // Permanent license
                    Status = "active"
                };
                order.Licenses.Add(license);
            }
            await _orderRepository.UpdateAsync(order);

            return _mapper.Map<OrderDTO>(order);
        }

        public async Task UpdateOrderStatusAsync(int orderId, string status)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null) throw new KeyNotFoundException("Order not found");
            order.Status = status;
            order.UpdatedAt = DateTime.UtcNow;
            await _orderRepository.UpdateAsync(order);
        }

        public async Task DeleteOrderAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null) throw new KeyNotFoundException("Order not found");
            await _orderRepository.DeleteAsync(order);
        }
    }
}

