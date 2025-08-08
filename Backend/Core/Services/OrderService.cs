using Core.Interfaces;
using Raqmiya.Infrastructure;
using Shared.DTOs.OrderDTOs;
using Shared.DTOs.ProductDTOs;
using AutoMapper;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.Extensions.Logging;
using Backend.Constants;


namespace Core.Services
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepository _orderRepository;
        private readonly ILicenseRepository _licenseRepository;
        private readonly IProductRepository _productRepository;
        private readonly IPurchaseValidationService _purchaseValidationService;
        private readonly IMapper _mapper;
        private readonly ILogger<OrderService> _logger;

        public OrderService(
            IOrderRepository orderRepository, 
            ILicenseRepository licenseRepository,
            IProductRepository productRepository,
            IPurchaseValidationService purchaseValidationService,
            IMapper mapper,
            ILogger<OrderService> logger)
        {
            _orderRepository = orderRepository;
            _licenseRepository = licenseRepository;
            _productRepository = productRepository;
            _purchaseValidationService = purchaseValidationService;
            _mapper = mapper;
            _logger = logger;
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
            // Skip validation for now - proceed directly to order creation
            
            // Create order (quantity always 1 for digital products)
            var order = new Order
            {
                BuyerId = userId,
                OrderedAt = DateTime.UtcNow,
                Status = "Pending",
                OrderItems = new List<OrderItem>()
            };
            
            // Add order items with product details
            foreach (var item in dto.items)
            {
                var product = await _productRepository.GetByIdAsync(item.productId);
                if (product == null)
                {
                    throw new KeyNotFoundException($"Product with ID {item.productId} not found.");
                }
                
                order.OrderItems.Add(new OrderItem
                {
                    ProductId = item.productId,
                    UnitPrice = product.Price,
                    ProductNameSnapshot = product.Name,
                    CurrencySnapshot = product.Currency,
                    Quantity = 1 // Always 1 for digital products
                });
            }
            
            order.TotalAmount = order.OrderItems.Sum(i => i.UnitPrice);
            await _orderRepository.AddAsync(order);

            
            // Generate licenses for each product
            await GenerateLicensesAsync(order);
            
            _logger.LogInformation("Order {OrderId} created for user {UserId} with {ItemCount} items", 
                order.Id, userId, order.OrderItems.Count);
            
// =======

//             // Generate a permanent license for each product in the order
//             foreach (var item in order.OrderItems)
//             {
//                 var license = new License
//                 {
//                     OrderId = order.Id,
//                     ProductId = item.ProductId,
//                     BuyerId = userId,
//                     LicenseKey = Guid.NewGuid().ToString(),
//                     AccessGrantedAt = DateTime.UtcNow,
//                     ExpiresAt = null, // Permanent license
//                     Status = "active"
//                 };
//                 order.Licenses.Add(license);
//             }
//             await _orderRepository.UpdateAsync(order);

// >>>>>>> main
            return _mapper.Map<OrderDTO>(order);
        }

        private async Task GenerateLicensesAsync(Order order)
        {
            foreach (var item in order.OrderItems)
            {
                var product = await _productRepository.GetByIdAsync(item.ProductId);
                if (product == null) continue;
                
                var license = new License
                {
                    OrderId = order.Id,
                    ProductId = item.ProductId,
                    BuyerId = order.BuyerId,
                    AccessGrantedAt = DateTime.UtcNow,
                    Status = "active",
                    // Set ExpiresAt based on product type (subscription vs one-time)
                    ExpiresAt = GetProductExpiration(product)
                };
                
                await _licenseRepository.AddAsync(license);
                _logger.LogInformation("License {LicenseId} generated for product {ProductId} and user {UserId}", 
                    license.Id, item.ProductId, order.BuyerId);
            }
        }

        private DateTime? GetProductExpiration(Product product)
        {
            // For now, all products are one-time purchases (no expiration)
            // In the future, this could be based on product type or subscription settings
            return null;
        }

        public async Task<List<PurchasedProductDTO>> GetUserPurchasedProductsAsync(int userId)
        {
            var licenses = await _licenseRepository.GetActiveLicensesByUserIdAsync(userId);
            
            var purchasedProducts = new List<PurchasedProductDTO>();
            foreach (var license in licenses)
            {
                var product = await _productRepository.GetByIdAsync(license.ProductId);
                if (product == null) continue;
                
                var order = await _orderRepository.GetByIdAsync(license.OrderId);
                if (order == null) continue;
                
                var orderItem = order.OrderItems.FirstOrDefault(oi => oi.ProductId == license.ProductId);
                if (orderItem == null) continue;
                
                // Get product files
                var files = await _productRepository.GetProductFilesAsync(product.Id);
                var fileDtos = files.Select(f => new FileDTO 
                { 
                    Id = f.Id, 
                    Name = f.Name, 
                    FileUrl = f.FileUrl 
                }).ToList();
                
                purchasedProducts.Add(new PurchasedProductDTO
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    ProductPermalink = product.Permalink,
                    CoverImageUrl = product.CoverImageUrl,
                    CreatorUsername = product.Creator?.Username ?? "Unknown",
                    PurchasePrice = orderItem.UnitPrice,
                    PurchaseDate = order.OrderedAt,
                    OrderId = order.Id.ToString(),
                    LicenseStatus = license.Status,
                    LicenseExpiresAt = license.ExpiresAt,
                    Files = fileDtos,
                    ProductDescription = product.Description,
                    DownloadGuide = "Click the download button to access your files."
                });
            }
            
            return purchasedProducts;
        }

        public async Task<PurchasedProductDTO?> GetUserPurchasedProductAsync(int userId, int productId)
        {
            var licenses = await _licenseRepository.GetActiveLicensesByUserIdAsync(userId);
            var license = licenses.FirstOrDefault(l => l.ProductId == productId);
            
            if (license == null) return null;
            
            var product = await _productRepository.GetByIdAsync(license.ProductId);
            if (product == null) return null;
            
            var order = await _orderRepository.GetByIdAsync(license.OrderId);
            if (order == null) return null;
            
            var orderItem = order.OrderItems.FirstOrDefault(oi => oi.ProductId == license.ProductId);
            if (orderItem == null) return null;
            
            // Get product files
            var files = await _productRepository.GetProductFilesAsync(product.Id);
            var fileDtos = files.Select(f => new FileDTO 
            { 
                Id = f.Id, 
                Name = f.Name, 
                FileUrl = f.FileUrl 
            }).ToList();
            
            return new PurchasedProductDTO
            {
                ProductId = product.Id,
                ProductName = product.Name,
                ProductPermalink = product.Permalink,
                CoverImageUrl = product.CoverImageUrl,
                CreatorUsername = product.Creator?.Username ?? "Unknown",
                PurchasePrice = orderItem.UnitPrice,
                PurchaseDate = order.OrderedAt,
                OrderId = order.Id.ToString(),
                LicenseStatus = license.Status,
                LicenseExpiresAt = license.ExpiresAt,
                Files = fileDtos,
                ProductDescription = product.Description,
                DownloadGuide = "Click the download button to access your files."
            };
        }

        public async Task UpdateOrderStatusAsync(int orderId, string status)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null) throw new KeyNotFoundException(ErrorMessages.OrderNotFound);
            order.Status = status;
            order.UpdatedAt = DateTime.UtcNow;
            await _orderRepository.UpdateAsync(order);
            // Optionally: log or return SuccessMessages.OrderStatusUpdated
        }

        public async Task DeleteOrderAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null) throw new KeyNotFoundException(ErrorMessages.OrderNotFound);
            await _orderRepository.DeleteAsync(order);
            // Optionally: log or return SuccessMessages.OrderDeleted
        }

        public async Task<PaymentResultDTO> ProcessPaymentAsync(int orderId, int userId, PaymentRequestDTO paymentRequest)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null || order.BuyerId != userId)
            {
                return new PaymentResultDTO
                {
                    Success = false,
                    Message = ErrorMessages.OrderNotFound
                };
            }

            // Simulate payment processing (replace with real integration as needed)
            if (paymentRequest.Amount != order.TotalAmount)
            {
                return new PaymentResultDTO
                {
                    Success = false,
                    Message = "Payment amount does not match order total.",
                    PaymentStatus = "failed"
                };
            }

            // Mark order as paid (update status, save transaction ID, etc.)
            order.Status = "Paid";
            order.PaymentMethod = paymentRequest.PaymentMethod;
            order.PaymentStatus = "completed";
            order.TransactionId = paymentRequest.TransactionId;
            await _orderRepository.UpdateAsync(order);

            return new PaymentResultDTO
            {
                Success = true,
                Message = "Payment processed successfully.",
                TransactionId = paymentRequest.TransactionId,
                PaymentStatus = "completed"
            };
        }
    }
}
