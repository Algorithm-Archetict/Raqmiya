using Core.Interfaces;
using Raqmiya.Infrastructure;
using Shared.DTOs.OrderDTOs;
using Shared.DTOs.ProductDTOs;
using AutoMapper;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.Extensions.Logging;
using System;


namespace Core.Services
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepository _orderRepository;
        private readonly ILicenseRepository _licenseRepository;
        private readonly IProductRepository _productRepository;
        private readonly IPurchaseValidationService _purchaseValidationService;
        private readonly IPaymentMethodBalanceRepository _paymentMethodBalanceRepository;
        private readonly IMapper _mapper;
        private readonly ILogger<OrderService> _logger;

        public OrderService(
            IOrderRepository orderRepository, 
            ILicenseRepository licenseRepository,
            IProductRepository productRepository,
            IPurchaseValidationService purchaseValidationService,
            IPaymentMethodBalanceRepository paymentMethodBalanceRepository,
            IMapper mapper,
            ILogger<OrderService> logger)
        {
            _orderRepository = orderRepository;
            _licenseRepository = licenseRepository;
            _productRepository = productRepository;
            _purchaseValidationService = purchaseValidationService;
            _paymentMethodBalanceRepository = paymentMethodBalanceRepository;
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
            // Check for existing purchases to prevent duplicates
            foreach (var item in dto.items)
            {
                var hasExistingPurchase = await _purchaseValidationService.HasActivePurchaseAsync(userId, item.productId);
                if (hasExistingPurchase)
                {
                    throw new InvalidOperationException($"User already has an active purchase for product {item.productId}");
                }
            }
            
            // Create order (quantity always 1 for digital products)
            var order = new Order
            {
                BuyerId = userId,
                OrderedAt = DateTime.UtcNow,
                Status = "Completed", // Changed from "Pending" to "Completed"
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

            // Update balances: deduct from buyer, add to creator
            await UpdateBalancesForOrder(order);
            
            // Generate licenses for each product
            await GenerateLicensesAsync(order);
            
            _logger.LogInformation("Order {OrderId} created for user {UserId} with {ItemCount} items", 
                order.Id, userId, order.OrderItems.Count);
            
            return _mapper.Map<OrderDTO>(order);
        }

        private async Task UpdateBalancesForOrder(Order order)
        {
            try
            {
                foreach (var item in order.OrderItems)
                {
                    var product = await _productRepository.GetByIdAsync(item.ProductId);
                    if (product == null) continue;

                    var totalItemCost = item.UnitPrice * item.Quantity;

                    // Deduct from buyer's selected payment method
                    var buyerSelectedBalance = await _paymentMethodBalanceRepository.GetSelectedByUserIdAsync(order.BuyerId);
                    if (buyerSelectedBalance != null)
                    {
                        // Convert currency if needed
                        var buyerCurrency = buyerSelectedBalance.Currency;
                        var convertedAmount = ConvertCurrencyForBalance(totalItemCost, product.Currency, buyerCurrency).Result;
                        
                        await _paymentMethodBalanceRepository.UpdateBalanceAsync(
                            order.BuyerId, 
                            buyerSelectedBalance.PaymentMethodId, 
                            -convertedAmount, 
                            buyerCurrency);
                    }

                    // Add to creator's selected payment method
                    var creatorSelectedBalance = await _paymentMethodBalanceRepository.GetSelectedByUserIdAsync(product.CreatorId);
                    if (creatorSelectedBalance != null)
                    {
                        // Convert currency if needed
                        var creatorCurrency = creatorSelectedBalance.Currency;
                        var convertedAmount = ConvertCurrencyForBalance(totalItemCost, product.Currency, creatorCurrency).Result;
                        
                        await _paymentMethodBalanceRepository.UpdateBalanceAsync(
                            product.CreatorId, 
                            creatorSelectedBalance.PaymentMethodId, 
                            convertedAmount, 
                            creatorCurrency);
                    }
                }

                _logger.LogInformation("Balances updated for order {OrderId}", order.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating balances for order {OrderId}", order.Id);
                throw;
            }
        }

        private Task<decimal> ConvertCurrencyForBalance(decimal amount, string fromCurrency, string toCurrency)
        {
            if (fromCurrency == toCurrency) return Task.FromResult(amount);

            // Use the same conversion logic as the repository
            decimal convertedAmount = amount;
            if (fromCurrency == "USD" && toCurrency == "EGP")
                convertedAmount = amount * 50; // 1 USD = 50 EGP
            else if (fromCurrency == "EGP" && toCurrency == "USD")
                convertedAmount = amount * 0.02m; // 1 EGP = 0.02 USD

            return Task.FromResult(convertedAmount);
        }

        private async Task GenerateLicensesAsync(Order order)
        {
            foreach (var item in order.OrderItems)
            {
                var product = await _productRepository.GetByIdAsync(item.ProductId);
                if (product == null) continue;
                
                // Generate unique license key
                var licenseKey = GenerateLicenseKey(order.Id, order.BuyerId, item.ProductId);
                
                // Ensure uniqueness (very unlikely collision, but safety check)
                while (await _licenseRepository.GetByLicenseKeyAsync(licenseKey) != null)
                {
                    licenseKey = GenerateLicenseKey(order.Id, order.BuyerId, item.ProductId);
                }
                
                var license = new License
                {
                    OrderId = order.Id,
                    ProductId = item.ProductId,
                    BuyerId = order.BuyerId,
                    LicenseKey = licenseKey,
                    AccessGrantedAt = DateTime.UtcNow,
                    Status = "active",
                    // Set ExpiresAt based on product type (subscription vs one-time)
                    ExpiresAt = GetProductExpiration(product)
                };
                
                await _licenseRepository.AddAsync(license);
                _logger.LogInformation("License {LicenseId} with key {LicenseKey} generated for product {ProductId} and user {UserId}", 
                    license.Id, licenseKey, item.ProductId, order.BuyerId);
            }
        }

        private string GenerateLicenseKey(int orderId, int buyerId, int productId)
        {
            // Create a unique string combining the three IDs
            var combinedString = $"{orderId}-{buyerId}-{productId}-{DateTime.UtcNow.Ticks}";
            
            // Generate SHA256 hash
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(combinedString));
            
            // Convert to hex string and take first 16 characters for a shorter key
            var licenseKey = Convert.ToHexString(hashBytes).Substring(0, 16).ToUpper();
            
            // Format as XXXX-XXXX-XXXX-XXXX for better readability
            return $"{licenseKey.Substring(0, 4)}-{licenseKey.Substring(4, 4)}-{licenseKey.Substring(8, 4)}-{licenseKey.Substring(12, 4)}";
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
                var product = await _productRepository.GetProductWithAllDetailsAsync(license.ProductId);
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
                FileUrl = f.FileUrl,
                Size = f.Size
            }).ToList();
                
                purchasedProducts.Add(new PurchasedProductDTO
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    ProductPermalink = product.Permalink,
                    CoverImageUrl = product.CoverImageUrl,
                    ThumbnailImageUrl = product.ThumbnailImageUrl,
                    CreatorUsername = product.Creator?.Username ?? "Unknown",
                    CreatorId = product.CreatorId,
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
            
            var product = await _productRepository.GetProductWithAllDetailsAsync(license.ProductId);
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
                FileUrl = f.FileUrl,
                Size = f.Size
            }).ToList();
            
            return new PurchasedProductDTO
            {
                ProductId = product.Id,
                ProductName = product.Name,
                ProductPermalink = product.Permalink,
                CoverImageUrl = product.CoverImageUrl,
                ThumbnailImageUrl = product.ThumbnailImageUrl,
                CreatorUsername = product.Creator?.Username ?? "Unknown",
                CreatorId = product.CreatorId,
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

