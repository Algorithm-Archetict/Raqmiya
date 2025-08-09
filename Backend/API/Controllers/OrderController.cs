using API.Constants;
using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.Constants;
using Shared.DTOs.OrderDTOs;
using System.Security.Claims;
using Shared.DTOs.ProductDTOs;
using System.Linq;
using Raqmiya.Infrastructure;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly IPurchaseValidationService _purchaseValidationService;
        private readonly IProductRepository _productRepository;
        private readonly IOrderRepository _orderRepository;
        private readonly ILogger<OrderController> _logger;

        public OrderController(
            IOrderService orderService, 
            IPurchaseValidationService purchaseValidationService,
            IProductRepository productRepository,
            IOrderRepository orderRepository,
            ILogger<OrderController> logger)
        {
            _orderService = orderService;
            _purchaseValidationService = purchaseValidationService;
            _productRepository = productRepository;
            _orderRepository = orderRepository;
            _logger = logger;
        }

        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(object), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> CreateOrder([FromBody] OrderCreateDTO dto)
        {
            try
            {
                // Get user ID from JWT token
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var order = await _orderService.CreateOrderAsync(userId, dto);
                
                // Get the actual Order entity from the repository to access OrderItems
                var orderEntity = await _orderRepository.GetByIdAsync(order.Id);
                if (orderEntity == null)
                {
                    return BadRequest(new { success = false, message = "Order not found after creation" });
                }
                
                // Get product details for each item
                var orderItems = new List<object>();
                foreach (var item in orderEntity.OrderItems)
                {
                    var product = await _productRepository.GetByIdAsync(item.ProductId);
                    orderItems.Add(new
                    {
                        productId = item.ProductId,
                        name = product?.Name ?? "Unknown Product",
                        price = item.UnitPrice,
                        currency = product?.Currency ?? "USD",
                        quantity = item.Quantity
                    });
                }

                // Return the format expected by the frontend
                var response = new
                {
                    success = true,
                    order = new
                    {
                        id = orderEntity.Id.ToString(),
                        userId = orderEntity.BuyerId.ToString(),
                        items = orderItems,
                        subtotal = orderEntity.TotalAmount,
                        discount = 0m,
                        total = orderEntity.TotalAmount,
                        currency = "USD",
                        status = orderEntity.Status.ToLower(),
                        paymentMethod = "card",
                        paymentStatus = "completed",
                        customerInfo = new
                        {
                            email = dto.CustomerInfo.Email,
                            phone = "",
                            country = "",
                            zipCode = ""
                        },
                        createdAt = orderEntity.OrderedAt,
                        updatedAt = orderEntity.OrderedAt
                    },
                    message = "Order created successfully"
                };
                
                return CreatedAtAction(nameof(GetOrderById), new { id = order.Id }, response);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Order creation failed due to business rule violation");
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    errorType = "BusinessRuleViolation"
                });
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Order creation failed - product not found");
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    errorType = "ProductNotFound"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating order");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while processing your order. Please try again.",
                    errorType = "InternalServerError"
                });
            }
        }

        [HttpGet("my")] // Get current user's orders
        [Authorize]
        [ProducesResponseType(typeof(List<OrderDTO>), 200)]
        public async Task<IActionResult> GetMyOrders()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var orders = await _orderService.GetOrdersByUserIdAsync(userId);
            return Ok(orders);
        }

        [HttpGet("validate-purchase/{productId}")]
        [Authorize]
        [ProducesResponseType(typeof(bool), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> ValidatePurchase(int productId)
        {
            try
            {
                // Get user ID from JWT token
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var canPurchase = await _purchaseValidationService.CanUserPurchaseProductAsync(userId, productId);
                
                _logger.LogInformation("ValidatePurchase called for product {ProductId} by user {UserId}, result: {CanPurchase}", 
                    productId, userId, canPurchase);
                
                return Ok(canPurchase);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating purchase for product {ProductId}", productId);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while validating your purchase. Please try again.",
                    errorType = "ValidationError"
                });
            }
        }

        // Temporary test endpoint to verify routing
        [HttpGet("test-validate/{productId}")]
        public async Task<IActionResult> TestValidatePurchase(int productId)
        {
            return Ok(new { 
                message = "Test endpoint working", 
                productId = productId,
                timestamp = DateTime.UtcNow
            });
        }

        // Temporary test endpoint without authentication
        [HttpGet("test-validate-auth/{productId}")]
        public async Task<IActionResult> TestValidatePurchaseWithoutAuth(int productId)
        {
            try
            {
                // Use hardcoded user ID for testing
                var userId = 9;
                var canPurchase = await _purchaseValidationService.CanUserPurchaseProductAsync(userId, productId);
                
                return Ok(new { 
                    message = "Validation test successful",
                    productId = productId,
                    userId = userId,
                    canPurchase = canPurchase,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    message = "Validation test failed",
                    error = ex.Message,
                    productId = productId
                });
            }
        }

        // Simple test endpoint to verify routing
        [HttpGet("ping")]
        public IActionResult Ping()
        {
            return Ok(new { 
                message = "OrderController is working", 
                timestamp = DateTime.UtcNow,
                routes = new[] {
                    "GET /api/orders/ping",
                    "GET /api/orders/validate-purchase/{productId}",
                    "GET /api/orders/test-validate-auth/{productId}"
                }
            });
        }

        [HttpGet("test-create")]
        public IActionResult TestCreate()
        {
            return Ok(new { 
                message = "CreateOrder endpoint is reachable", 
                timestamp = DateTime.UtcNow,
                method = "POST",
                route = "/api/orders"
            });
        }

        [HttpGet("test-no-auth")]
        [AllowAnonymous]
        public IActionResult TestNoAuth()
        {
            return Ok(new { 
                message = "OrderController is working without auth", 
                timestamp = DateTime.UtcNow,
                controller = "OrderController"
            });
        }

        [HttpGet("my-purchases")] // Get current user's purchased products
        [Authorize]
        [ProducesResponseType(typeof(List<PurchasedProductDTO>), 200)]
        public async Task<IActionResult> GetMyPurchasedProducts()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var purchasedProducts = await _orderService.GetUserPurchasedProductsAsync(userId);
            return Ok(purchasedProducts);
        }

        [HttpGet("my-purchases/{productId}")] // Get specific purchased product
        [Authorize]
        [ProducesResponseType(typeof(PurchasedProductDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetMyPurchasedProduct(int productId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var purchasedProduct = await _orderService.GetUserPurchasedProductAsync(userId, productId);
            
            if (purchasedProduct == null)
            {
                return NotFound("Product not found or you do not have access to it.");
            }
            
            return Ok(purchasedProduct);
        }

        [HttpGet("test-purchase-validation")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> TestPurchaseValidation()
        {
            try
            {
                var userId = 9;
                var products = await _productRepository.GetAllAsync(1, 10);
                
                var results = new List<object>();
                foreach (var product in products)
                {
                    var canPurchase = await _purchaseValidationService.CanUserPurchaseProductAsync(userId, product.Id);
                    var hasActiveLicense = await _purchaseValidationService.HasActivePurchaseAsync(userId, product.Id);
                    
                    results.Add(new
                    {
                        productId = product.Id,
                        productName = product.Name,
                        canPurchase = canPurchase,
                        hasActiveLicense = hasActiveLicense
                    });
                }
                
                return Ok(new
                {
                    userId = userId,
                    products = results
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing purchase validation");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet]
        [Authorize(Roles = RoleConstants.Admin)]
        [ProducesResponseType(typeof(List<OrderDTO>), 200)]
        public async Task<IActionResult> GetAllOrders()
        {
            var orders = await _orderService.GetAllOrdersAsync();
            return Ok(orders);
        }

        [HttpGet("{id}")]
        [Authorize]
        [ProducesResponseType(typeof(OrderDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _orderService.GetOrderByIdAsync(id);
            if (order == null) return NotFound();
            return Ok(order);
        }

        [HttpPut("{id}/status")]
        [Authorize]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] OrderUpdateDTO dto)
        {
            if (id != dto.Id) return BadRequest("Order ID mismatch.");
            await _orderService.UpdateOrderStatusAsync(id, dto.Status);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            await _orderService.DeleteOrderAsync(id);
            return NoContent();
        }

        [HttpPost("{orderId}/payment")]
        [Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> ProcessPayment(int orderId, [FromBody] PaymentRequestDTO paymentRequest)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                // Call the service method (to be implemented)
                var result = await _orderService.ProcessPaymentAsync(orderId, userId, paymentRequest);
                if (result.Success)
                {
                    return Ok(result);
                }
                else
                {
                    return BadRequest(result);
                }
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { success = false, message = "Order not found." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment for order {OrderId}", orderId);
                return StatusCode(500, new { success = false, message = "Internal server error." });
            }
        }
    }
}
