using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Core.Interfaces;
using Shared.DTOs;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Raqmiya.Infrastructure;

namespace API.Controllers
{
    [ApiController]
    [Route("api/revenue-analytics")]
    [Authorize]
    public class RevenueAnalyticsController : ControllerBase
    {
        private readonly IRevenueAnalyticsService _revenueAnalyticsService;
        private readonly ILogger<RevenueAnalyticsController> _logger;
        private readonly RaqmiyaDbContext _context;

        public RevenueAnalyticsController(
            IRevenueAnalyticsService revenueAnalyticsService,
            ILogger<RevenueAnalyticsController> logger,
            RaqmiyaDbContext context)
        {
            _revenueAnalyticsService = revenueAnalyticsService;
            _logger = logger;
            _context = context;
        }

        [HttpGet("creator/{creatorId}")]
        public async Task<IActionResult> GetCreatorRevenueAnalytics(int creatorId, [FromQuery] string currency = "USD")
        {
            try
            {
                var analytics = await _revenueAnalyticsService.GetCreatorRevenueAnalyticsAsync(creatorId, currency);
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting revenue analytics for creator {CreatorId}", creatorId);
                return StatusCode(500, new { error = "Failed to get revenue analytics" });
            }
        }

        [HttpGet("creator/{creatorId}/total")]
        public async Task<IActionResult> GetCreatorTotalRevenue(int creatorId, [FromQuery] string currency = "USD")
        {
            try
            {
                var totalRevenue = await _revenueAnalyticsService.GetCreatorTotalRevenueAsync(creatorId, currency);
                return Ok(new { totalRevenue, currency });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting total revenue for creator {CreatorId}", creatorId);
                return StatusCode(500, new { error = "Failed to get total revenue" });
            }
        }

        [HttpGet("creator/{creatorId}/monthly")]
        public async Task<IActionResult> GetCreatorMonthlyRevenue(int creatorId, [FromQuery] string currency = "USD")
        {
            try
            {
                var monthlyRevenue = await _revenueAnalyticsService.GetCreatorMonthlyRevenueAsync(creatorId, currency);
                return Ok(new { monthlyRevenue, currency });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting monthly revenue for creator {CreatorId}", creatorId);
                return StatusCode(500, new { error = "Failed to get monthly revenue" });
            }
        }

        [HttpGet("creator/{creatorId}/weekly")]
        public async Task<IActionResult> GetCreatorWeeklyRevenue(int creatorId, [FromQuery] string currency = "USD")
        {
            try
            {
                var weeklyRevenue = await _revenueAnalyticsService.GetCreatorWeeklyRevenueAsync(creatorId, currency);
                return Ok(new { weeklyRevenue, currency });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting weekly revenue for creator {CreatorId}", creatorId);
                return StatusCode(500, new { error = "Failed to get weekly revenue" });
            }
        }

        [HttpGet("creator/{creatorId}/top-products")]
        public async Task<IActionResult> GetCreatorTopProducts(int creatorId, [FromQuery] int count = 5, [FromQuery] string currency = "USD")
        {
            try
            {
                var topProducts = await _revenueAnalyticsService.GetCreatorTopProductsAsync(creatorId, count, currency);
                return Ok(topProducts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top products for creator {CreatorId}", creatorId);
                return StatusCode(500, new { error = "Failed to get top products" });
            }
        }

        [HttpGet("convert-currency")]
        public async Task<IActionResult> ConvertCurrency([FromQuery] decimal amount, [FromQuery] string fromCurrency, [FromQuery] string toCurrency)
        {
            try
            {
                var convertedAmount = await _revenueAnalyticsService.ConvertCurrencyAsync(amount, fromCurrency, toCurrency);
                return Ok(new { 
                    originalAmount = amount, 
                    fromCurrency, 
                    toCurrency, 
                    convertedAmount 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error converting currency from {FromCurrency} to {ToCurrency}", fromCurrency, toCurrency);
                return StatusCode(500, new { error = "Failed to convert currency" });
            }
        }

        [HttpGet("my-analytics")]
        public async Task<IActionResult> GetMyRevenueAnalytics([FromQuery] string currency = "USD")
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var analytics = await _revenueAnalyticsService.GetCreatorRevenueAnalyticsAsync(userId, currency);
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting revenue analytics for current user");
                return StatusCode(500, new { error = "Failed to get revenue analytics" });
            }
        }

        [HttpGet("debug/orders")]
        public async Task<IActionResult> DebugOrders()
        {
            try
            {
                var orders = await _context.Orders
                    .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                    .ToListAsync();

                var debugInfo = orders.Select(o => new
                {
                    OrderId = o.Id,
                    Status = o.Status,
                    BuyerId = o.BuyerId,
                    OrderedAt = o.OrderedAt,
                    Items = o.OrderItems.Select(oi => new
                    {
                        ProductId = oi.ProductId,
                        ProductName = oi.Product?.Name,
                        CreatorId = oi.Product?.CreatorId,
                        Price = oi.UnitPrice,
                        Quantity = oi.Quantity
                    }).ToList()
                }).ToList();

                return Ok(new { 
                    TotalOrders = orders.Count,
                    Orders = debugInfo
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting debug orders info");
                return StatusCode(500, new { error = "Failed to get debug info" });
            }
        }

        [HttpPost("test/create-order")]
        public async Task<IActionResult> CreateTestOrder()
        {
            try
            {
                // Get the first creator user
                var creator = await _context.Users.FirstOrDefaultAsync(u => u.Role == "Creator");
                if (creator == null)
                {
                    return BadRequest("No creator user found");
                }

                // Get the first product
                var product = await _context.Products.FirstOrDefaultAsync(p => p.CreatorId == creator.Id);
                if (product == null)
                {
                    return BadRequest("No product found for creator");
                }

                // Get the first customer user
                var customer = await _context.Users.FirstOrDefaultAsync(u => u.Role == "Customer");
                if (customer == null)
                {
                    return BadRequest("No customer user found");
                }

                // Create a test order
                var order = new Order
                {
                    BuyerId = customer.Id,
                    OrderedAt = DateTime.UtcNow,
                    Status = "Completed",
                    TotalAmount = product.Price,
                    OrderItems = new List<OrderItem>
                    {
                        new OrderItem
                        {
                            ProductId = product.Id,
                            UnitPrice = product.Price,
                            ProductNameSnapshot = product.Name,
                            CurrencySnapshot = product.Currency,
                            Quantity = 1
                        }
                    }
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = "Test order created successfully",
                    orderId = order.Id,
                    productName = product.Name,
                    price = product.Price,
                    creatorId = creator.Id
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating test order");
                return StatusCode(500, new { error = "Failed to create test order" });
            }
        }

        [HttpGet("test/order-count")]
        public async Task<IActionResult> GetOrderCount()
        {
            try
            {
                var totalOrders = await _context.Orders.CountAsync();
                var completedOrders = await _context.Orders.CountAsync(o => o.Status == "Completed");
                var pendingOrders = await _context.Orders.CountAsync(o => o.Status == "Pending");

                return Ok(new { 
                    totalOrders,
                    completedOrders,
                    pendingOrders
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting order count");
                return StatusCode(500, new { error = "Failed to get order count" });
            }
        }

        [HttpGet("test/public/order-count")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicOrderCount()
        {
            try
            {
                var totalOrders = await _context.Orders.CountAsync();
                var completedOrders = await _context.Orders.CountAsync(o => o.Status == "Completed");
                var pendingOrders = await _context.Orders.CountAsync(o => o.Status == "Pending");

                return Ok(new { 
                    totalOrders,
                    completedOrders,
                    pendingOrders,
                    message = "This endpoint is public and doesn't require authentication"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting public order count");
                return StatusCode(500, new { error = "Failed to get order count", details = ex.Message });
            }
        }

        [HttpGet("test/public/database-status")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDatabaseStatus()
        {
            try
            {
                var userCount = await _context.Users.CountAsync();
                var productCount = await _context.Products.CountAsync();
                var orderCount = await _context.Orders.CountAsync();
                var orderItemCount = await _context.OrderItems.CountAsync();

                var creatorUsers = await _context.Users.Where(u => u.Role == "Creator").CountAsync();
                var customerUsers = await _context.Users.Where(u => u.Role == "Customer").CountAsync();

                return Ok(new { 
                    users = userCount,
                    products = productCount,
                    orders = orderCount,
                    orderItems = orderItemCount,
                    creators = creatorUsers,
                    customers = customerUsers,
                    message = "Database status check completed"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting database status");
                return StatusCode(500, new { error = "Failed to get database status", details = ex.Message });
            }
        }
    }
}
