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
        private readonly IPaymentMethodBalanceRepository _paymentMethodBalanceRepository;
        private readonly ILogger<PaymentController> _logger;

        public PaymentController(
            IStripeService stripeService,
            IUserRepository userRepository,
            IPaymentMethodBalanceRepository paymentMethodBalanceRepository,
            ILogger<PaymentController> logger)
        {
            _stripeService = stripeService;
            _userRepository = userRepository;
            _paymentMethodBalanceRepository = paymentMethodBalanceRepository;
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

                // Persist an associated PaymentMethodBalance record if not exists
                var existingBalance = await _paymentMethodBalanceRepository.GetByPaymentMethodIdAsync(paymentMethod.Id);
                if (existingBalance == null)
                {
                    var balance = new PaymentMethodBalance
                    {
                        UserId = user.Id,
                        PaymentMethodId = paymentMethod.Id,
                        Balance = 0m,
                        Currency = "USD", // default; conversions handled elsewhere
                        CardBrand = paymentMethod.Card?.Brand ?? string.Empty,
                        CardLast4 = paymentMethod.Card?.Last4 ?? string.Empty,
                        CreatedAt = DateTime.UtcNow,
                        LastUpdated = DateTime.UtcNow
                    };
                    await _paymentMethodBalanceRepository.AddAsync(balance);
                }

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
        public async Task<IActionResult> MakePayment([FromBody] MakePaymentRequest request)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                
                // Get user's selected payment method
                var selectedBalance = await _paymentMethodBalanceRepository.GetSelectedByUserIdAsync(userId);
                if (selectedBalance == null)
                {
                    return BadRequest(new { error = "No payment method selected" });
                }

                // Check if user has sufficient balance
                if (selectedBalance.Balance < request.Amount)
                {
                    return BadRequest(new { error = "Insufficient balance" });
                }

                // Process payment through Stripe (simulated)
                var paymentResult = await _stripeService.CreateTestPaymentIntentForBalanceAsync(
                    request.Amount, 
                    request.Currency, 
                    request.Description);

                if (paymentResult.Success)
                {
                    // Update the balance
                    await _paymentMethodBalanceRepository.UpdateBalanceAsync(
                        userId, 
                        selectedBalance.PaymentMethodId, 
                        -request.Amount, 
                        selectedBalance.Currency);

                    return Ok(new { 
                        success = true, 
                        message = "Payment processed successfully",
                        paymentIntentId = paymentResult.PaymentIntentId
                    });
                }
                else
                {
                    return BadRequest(new { error = "Payment failed", details = paymentResult.ErrorMessage });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment");
                return StatusCode(500, new { error = "Failed to process payment" });
            }
        }

        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance([FromQuery] string currency = "USD")
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                
                // Get selected payment method balance
                var selectedBalance = await _paymentMethodBalanceRepository.GetSelectedByUserIdAsync(userId);
                if (selectedBalance == null)
                {
                    return Ok(new
                    {
                        currentBalance = 0m,
                        currency = currency.ToUpperInvariant(),
                        lastUpdated = DateTime.UtcNow,
                        selectedPaymentMethod = (object?)null
                    });
                }

                // Convert from stored currency to requested currency (USD/EGP only)
                decimal amount = selectedBalance.Balance;
                var from = (selectedBalance.Currency ?? "USD").ToUpperInvariant();
                var to = (currency ?? "USD").ToUpperInvariant();

                if (from != to)
                {
                    if (from == "USD" && to == "EGP") amount = amount * 50m;
                    else if (from == "EGP" && to == "USD") amount = amount * 0.02m;
                }

                var response = new
                {
                    currentBalance = amount,
                    currency = to,
                    lastUpdated = selectedBalance.LastUpdated,
                    selectedPaymentMethod = new
                    {
                        id = selectedBalance.Id,
                        paymentMethodId = selectedBalance.PaymentMethodId,
                        balance = selectedBalance.Balance,
                        currency = selectedBalance.Currency,
                        cardBrand = selectedBalance.CardBrand,
                        cardLast4 = selectedBalance.CardLast4
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting balance for user");
                return StatusCode(500, new { error = "Failed to get balance" });
            }
        }

        [HttpPost("select-payment-method")]
        public async Task<IActionResult> SelectPaymentMethod([FromBody] SelectPaymentMethodRequest request)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                
                var success = await _paymentMethodBalanceRepository.SetSelectedAsync(userId, request.BalanceId);
                
                if (success)
                {
                    return Ok(new { message = "Payment method selected successfully" });
                }
                else
                {
                    return BadRequest(new { error = "Failed to select payment method" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error selecting payment method");
                return StatusCode(500, new { error = "Failed to select payment method" });
            }
        }

        [HttpPost("select-payment-method-by-stripe")]
        public async Task<IActionResult> SelectPaymentMethodByStripe([FromBody] SelectPaymentMethodByStripeRequest request)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var balance = await _paymentMethodBalanceRepository.GetByPaymentMethodIdAsync(request.PaymentMethodId);
                if (balance == null || balance.UserId != userId)
                {
                    return NotFound(new { error = "Payment method not found for user" });
                }

                var success = await _paymentMethodBalanceRepository.SetSelectedAsync(userId, balance.Id);
                if (success)
                {
                    return Ok(new { message = "Payment method selected successfully" });
                }
                return BadRequest(new { error = "Failed to select payment method" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error selecting payment method by stripe id");
                return StatusCode(500, new { error = "Failed to select payment method" });
            }
        }

        [HttpGet("payment-methods")]
        public async Task<IActionResult> GetPaymentMethods()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                if (string.IsNullOrEmpty(user.StripeCustomerId))
                {
                    return Ok(new List<PaymentMethodDTO>()); // no methods yet
                }

                // Source of truth is our database table
                var balances = await _paymentMethodBalanceRepository.GetByUserIdAsync(user.Id);

                // Map DB rows to Stripe-shaped DTO for the frontend
                var response = balances.Select(b => new PaymentMethodDTO
                {
                    Id = b.PaymentMethodId,
                    Type = "card",
                    Card = new CardInfo
                    {
                        Brand = b.CardBrand ?? string.Empty,
                        Last4 = b.CardLast4 ?? string.Empty,
                        ExpMonth = 0,
                        ExpYear = 0,
                        Country = string.Empty
                    },
                    IsDefault = b.IsSelected,
                    Created = b.CreatedAt
                }).ToList();

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payment methods");
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

    public class SelectPaymentMethodRequest
    {
        public int BalanceId { get; set; }
    }

    public class MakePaymentRequest
    {
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        public string Description { get; set; } = string.Empty;
    }

    public class SelectPaymentMethodByStripeRequest
    {
        public string PaymentMethodId { get; set; } = string.Empty;
    }
}