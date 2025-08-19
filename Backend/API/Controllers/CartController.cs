using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Core.Interfaces;
using Shared.DTOs.OrderDTOs;
using System.Security.Claims;
using Microsoft.Extensions.Logging;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;
        private readonly ILogger<CartController> _logger;

        public CartController(ICartService cartService, ILogger<CartController> logger)
        {
            _cartService = cartService;
            _logger = logger;
        }

        
        [HttpGet]
        [ProducesResponseType(typeof(CartResponseDTO), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetCart()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var cartResponse = await _cartService.GetUserCartAsync(userId);
                
                if (cartResponse.Success)
                {
                    return Ok(cartResponse);
                }
                else
                {
                    return BadRequest(cartResponse);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cart for user");
                return StatusCode(500, new CartResponseDTO
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        [HttpPost("add")]
        [ProducesResponseType(typeof(CartResponseDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartRequestDTO request)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var cartResponse = await _cartService.AddToCartAsync(userId, request);
                
                if (cartResponse.Success)
                {
                    return Ok(cartResponse);
                }
                else
                {
                    return BadRequest(cartResponse);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding product {ProductId} to cart", request.ProductId);
                return StatusCode(500, new CartResponseDTO
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        [HttpDelete("remove/{productId}")]
        [ProducesResponseType(typeof(CartResponseDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> RemoveFromCart(int productId)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var cartResponse = await _cartService.RemoveFromCartAsync(userId, productId);
                
                if (cartResponse.Success)
                {
                    return Ok(cartResponse);
                }
                else
                {
                    return BadRequest(cartResponse);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing product {ProductId} from cart", productId);
                return StatusCode(500, new CartResponseDTO
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        [HttpPut("update")]
        [ProducesResponseType(typeof(CartResponseDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> UpdateCartItem([FromBody] UpdateCartItemRequestDTO request)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var cartResponse = await _cartService.UpdateCartItemAsync(userId, request);
                
                if (cartResponse.Success)
                {
                    return Ok(cartResponse);
                }
                else
                {
                    return BadRequest(cartResponse);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating cart item for product {ProductId}", request.ProductId);
                return StatusCode(500, new CartResponseDTO
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        [HttpDelete("clear")]
        [ProducesResponseType(typeof(CartResponseDTO), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> ClearCart()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var cartResponse = await _cartService.ClearCartAsync(userId);
                
                if (cartResponse.Success)
                {
                    return Ok(cartResponse);
                }
                else
                {
                    return BadRequest(cartResponse);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing cart for user");
                return StatusCode(500, new CartResponseDTO
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }
    }
} 