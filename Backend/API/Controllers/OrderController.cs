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
using Shared.DTOs;

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
        private readonly IStripeService _stripeService;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<OrderController> _logger;
        private readonly IEmailService _emailService; // Added email service

        public OrderController(
            IOrderService orderService, 
            IPurchaseValidationService purchaseValidationService,
            IProductRepository productRepository,
            IOrderRepository orderRepository,
            IStripeService stripeService,
            IUserRepository userRepository,
            ILogger<OrderController> logger,
            IEmailService emailService) // Added email service to constructor
        {
            _orderService = orderService;
            _purchaseValidationService = purchaseValidationService;
            _productRepository = productRepository;
            _orderRepository = orderRepository;
            _stripeService = stripeService;
            _userRepository = userRepository;
            _logger = logger;
            _emailService = emailService; // Initialize email service
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
                
                // Get user to check balance and Stripe customer ID
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    return BadRequest(new { success = false, message = "User not found" });
                }

                // Check if user has a payment method (Stripe customer ID)
                if (string.IsNullOrEmpty(user.StripeCustomerId))
                {
                    return BadRequest(new { success = false, message = "Please add a payment method before making a purchase. Go to Settings > Payment to add your card." });
                }

                // Calculate total order amount
                decimal totalAmount = 0;
                foreach (var item in dto.items)
                {
                    var product = await _productRepository.GetByIdAsync(item.productId);
                    if (product == null)
                    {
                        return BadRequest(new { success = false, message = $"Product with ID {item.productId} not found" });
                    }
                    totalAmount += product.Price * item.quantity;
                }

                // Check if user has sufficient balance
                if (user.AccountBalance < totalAmount)
                {
                    return BadRequest(new { success = false, message = $"Insufficient balance. You have ${user.AccountBalance:F2} but need ${totalAmount:F2}" });
                }

                // Create Stripe payment intent for simulation
                try
                {
                    var paymentIntent = await _stripeService.CreateTestPaymentIntentAsync(
                        (long)(totalAmount * 100), // Convert to cents
                        "usd",
                        user.StripeCustomerId
                    );

                    _logger.LogInformation($"Created Stripe payment intent {paymentIntent.Id} for user {userId}, amount: ${totalAmount:F2}");
                }
                catch (Exception stripeEx)
                {
                    _logger.LogError($"Failed to create Stripe payment intent: {stripeEx.Message}");
                    return BadRequest(new { success = false, message = "Payment processing failed. Please try again." });
                }

                // Deduct amount from user's balance
                user.AccountBalance -= totalAmount;
                await _userRepository.UpdateAsync(user);

                // Update creator revenues for each product
                foreach (var item in dto.items)
                {
                    var product = await _productRepository.GetByIdAsync(item.productId);
                    if (product != null)
                    {
                        // Get creator user (CreatorId is required, not nullable)
                        var creator = await _userRepository.GetByIdAsync(product.CreatorId);
                        if (creator != null)
                        {
                            // Add revenue to creator's balance
                            var creatorRevenue = product.Price * item.quantity;
                            creator.AccountBalance += creatorRevenue;
                            await _userRepository.UpdateAsync(creator);
                            
                            _logger.LogInformation($"Added ${creatorRevenue:F2} revenue to creator {creator.Username} for product {product.Name}");
                        }
                    }
                }

                // Create the order
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
                            email = dto.customerInfo.email,
                            phone = "",
                            country = "",
                            zipCode = ""
                        },
                        createdAt = orderEntity.OrderedAt,
                        updatedAt = orderEntity.OrderedAt
                    },
                    message = "Order created successfully",
                    payment = new
                    {
                        success = true,
                        amount = totalAmount,
                        remainingBalance = user.AccountBalance,
                        message = "Payment processed successfully from account balance"
                    }
                };

                // Send email notification to customer
                try
                {
                    var emailSubject = "Purchase Confirmation - Raqmiya";
                    var emailBody = $@"
                        <h2>Purchase Confirmation</h2>
                        <p>Dear {user.Username},</p>
                        <p>Your purchase has been confirmed successfully!</p>
                        <p><strong>Order Details:</strong></p>
                        <ul>
                            <li>Order ID: {orderEntity.Id}</li>
                            <li>Total Amount: ${totalAmount:F2}</li>
                            <li>Payment Method: Account Balance</li>
                            <li>Remaining Balance: ${user.AccountBalance:F2}</li>
                        </ul>
                        <p><strong>Purchased Items:</strong></p>
                        <ul>";
                    
                    foreach (var item in orderItems)
                    {
                        // Use reflection to access anonymous object properties
                        var nameProperty = item.GetType().GetProperty("name");
                        var priceProperty = item.GetType().GetProperty("price");
                        var name = nameProperty?.GetValue(item)?.ToString() ?? "Unknown Product";
                        var price = priceProperty?.GetValue(item);
                        if (price is decimal priceValue)
                        {
                            emailBody += $"<li>{name} - ${priceValue:F2}</li>";
                        }
                        else
                        {
                            emailBody += $"<li>{name} - Price unavailable</li>";
                        }
                    }
                    
                    emailBody += $@"
                        </ul>
                        <p>Thank you for your purchase!</p>
                        <p>Best regards,<br>The Raqmiya Team</p>";

                    await _emailService.SendEmailAsync(dto.customerInfo.email, emailSubject, emailBody);
                    _logger.LogInformation($"Purchase confirmation email sent to {dto.customerInfo.email}");
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send purchase confirmation email: {emailEx.Message}");
                    // Don't fail the order creation if email fails
                }

                return CreatedAtAction(nameof(GetOrderById), new { id = orderEntity.Id }, response);
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
    }
}
