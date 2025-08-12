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
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly IStripeService _stripeService;
        private readonly IUserRepository _userRepository;
        private readonly RaqmiyaDbContext _context;
        private readonly ILogger<PaymentController> _logger;

        public PaymentController(
            IStripeService stripeService,
            IUserRepository userRepository,
            RaqmiyaDbContext context,
            ILogger<PaymentController> logger)
        {
            _stripeService = stripeService;
            _userRepository = userRepository;
            _context = context;
            _logger = logger;
        }

        [HttpGet("config")]
        public IActionResult GetStripeConfig()
        {
            try
            {
                var publishableKey = _stripeService.GetPublishableKey();
                return Ok(new StripeConfigResponseDTO
                {
                    PublishableKey = publishableKey
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Stripe configuration");
                return StatusCode(500, new { error = "Failed to get Stripe configuration" });
            }
        }

        [HttpPost("add-payment-method")]
        public async Task<IActionResult> AddPaymentMethod([FromBody] AddPaymentMethodRequestDTO request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0)
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                // Create Stripe customer if doesn't exist
                if (string.IsNullOrEmpty(user.StripeCustomerId))
                {
                    var customer = await _stripeService.CreateCustomerAsync(user);
                    user.StripeCustomerId = customer.Id;
                    await _userRepository.UpdateAsync(user);
                }

                // Attach payment method to customer
                var paymentMethod = await _stripeService.AttachPaymentMethodAsync(
                    request.PaymentMethodId, 
                    user.StripeCustomerId);

                // Set as default payment method
                await _stripeService.SetDefaultPaymentMethodAsync(
                    request.PaymentMethodId, 
                    user.StripeCustomerId);

                return Ok(new AddPaymentMethodResponseDTO
                {
                    Success = true,
                    Message = "Payment method added successfully",
                    CustomerId = user.StripeCustomerId,
                    PaymentMethodId = paymentMethod.Id
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding payment method for user {UserId}", GetCurrentUserId());
                return StatusCode(500, new { error = "Failed to add payment method" });
            }
        }

        [HttpPost("make-payment")]
        public async Task<IActionResult> MakePayment([FromBody] PaymentRequestDTO request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0)
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                if (string.IsNullOrEmpty(user.StripeCustomerId))
                {
                    return BadRequest(new { error = "No payment method found. Please add a payment method first." });
                }

                // Check if user has sufficient balance
                var amountInDollars = request.Amount / 100m; // Convert cents to dollars
                if (user.AccountBalance < amountInDollars)
                {
                    return BadRequest(new { error = "Insufficient balance" });
                }

                // Create test payment intent
                var paymentIntent = await _stripeService.CreateTestPaymentIntentAsync(
                    request.Amount,
                    request.Currency,
                    user.StripeCustomerId);

                // Deduct from user's balance
                user.AccountBalance -= amountInDollars;
                await _userRepository.UpdateAsync(user);

                _logger.LogInformation("Payment processed successfully for user {UserId}. Amount: {Amount}, Remaining balance: {Balance}", 
                    userId, amountInDollars, user.AccountBalance);

                return Ok(new PaymentResponseDTO
                {
                    Success = true,
                    Message = "Payment processed successfully",
                    PaymentIntentId = paymentIntent.Id,
                    Amount = request.Amount,
                    Currency = request.Currency,
                    RemainingBalance = user.AccountBalance
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment for user {UserId}", GetCurrentUserId());
                return StatusCode(500, new { error = "Failed to process payment" });
            }
        }

        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0)
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                return Ok(new BalanceResponseDTO
                {
                    CurrentBalance = user.AccountBalance,
                    Currency = "USD",
                    LastUpdated = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting balance for user {UserId}", GetCurrentUserId());
                return StatusCode(500, new { error = "Failed to get balance" });
            }
        }

        [HttpGet("payment-methods")]
        public async Task<IActionResult> GetPaymentMethods()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0)
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                if (string.IsNullOrEmpty(user.StripeCustomerId))
                {
                    return Ok(new List<PaymentMethodDTO>());
                }

                var paymentMethods = await _stripeService.GetPaymentMethodsAsync(user.StripeCustomerId);
                var paymentMethodDTOs = paymentMethods.Data.Select(pm => new PaymentMethodDTO
                {
                    Id = pm.Id,
                    Type = pm.Type,
                    Card = new CardInfo
                    {
                        Brand = pm.Card?.Brand ?? "",
                        Last4 = pm.Card?.Last4 ?? "",
                        ExpMonth = (int)(pm.Card?.ExpMonth ?? 0),
                        ExpYear = (int)(pm.Card?.ExpYear ?? 0),
                        Country = pm.Card?.Country ?? ""
                    },
                    IsDefault = pm.Id == user.StripeCustomerId, // This is a simplified check
                    Created = pm.Created
                }).ToList();

                return Ok(paymentMethodDTOs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payment methods for user {UserId}", GetCurrentUserId());
                return StatusCode(500, new { error = "Failed to get payment methods" });
            }
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out int userId))
            {
                return userId;
            }
            return 0;
        }
    }
}