using Core.Interfaces;
using Shared.DTOs.OrderDTOs;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Core.Services
{
    public class CartService : ICartService
    {
        private readonly IProductService _productService;
        private readonly ILogger<CartService> _logger;
        
        // In-memory cart storage (in production, this would be in database)
        private static readonly Dictionary<int, CartDTO> _userCarts = new Dictionary<int, CartDTO>();

        public CartService(IProductService productService, ILogger<CartService> logger)
        {
            _productService = productService;
            _logger = logger;
        }

        public async Task<CartResponseDTO> GetUserCartAsync(int userId)
        {
            try
            {
                if (!_userCarts.ContainsKey(userId))
                {
                    // Create new cart for user
                    _userCarts[userId] = new CartDTO
                    {
                        Id = $"cart_{userId}",
                        UserId = userId,
                        Items = new List<CartItemDTO>(),
                        Subtotal = 0,
                        Discount = 0,
                        Total = 0,
                        Currency = "USD",
                        CreatedAt = System.DateTime.UtcNow,
                        UpdatedAt = System.DateTime.UtcNow
                    };
                }

                var cart = _userCarts[userId];
                CalculateCartTotals(cart);

                return new CartResponseDTO
                {
                    Success = true,
                    Cart = cart,
                    Message = "Cart retrieved successfully"
                };
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error getting cart for user {UserId}", userId);
                return new CartResponseDTO
                {
                    Success = false,
                    Message = "Failed to retrieve cart"
                };
            }
        }

        public async Task<CartResponseDTO> AddToCartAsync(int userId, AddToCartRequestDTO request)
        {
            try
            {
                // Get or create cart
                var cart = await GetUserCartAsync(userId);
                if (!cart.Success)
                {
                    return cart;
                }

                // Get product details
                var product = await _productService.GetByIdAsync(request.ProductId);
                if (product == null)
                {
                    return new CartResponseDTO
                    {
                        Success = false,
                        Message = "Product not found"
                    };
                }

                // Check if product is already in cart
                var existingItem = cart.Cart.Items.FirstOrDefault(i => i.ProductId == request.ProductId);
                if (existingItem != null)
                {
                    // For digital products, we don't allow quantity > 1
                    return new CartResponseDTO
                    {
                        Success = false,
                        Message = "Product is already in your cart"
                    };
                }

                // Get creator name from product service
                var productDetail = await _productService.GetProductDetailsByIdAsync(request.ProductId);
                var creatorName = productDetail?.CreatorUsername ?? "Unknown";

                // Add new item to cart
                var newItem = new CartItemDTO
                {
                    ProductId = product.Id,
                    Name = product.Name,
                    Price = product.Price,
                    Currency = product.Currency,
                    Creator = creatorName,
                    Image = product.ThumbnailImageUrl ?? product.CoverImageUrl ?? "",
                    Quantity = 1 // Always 1 for digital products
                };

                cart.Cart.Items.Add(newItem);
                CalculateCartTotals(cart.Cart);
                cart.Cart.UpdatedAt = System.DateTime.UtcNow;

                // Update in-memory storage
                _userCarts[userId] = cart.Cart;

                _logger.LogInformation("Product {ProductId} added to cart for user {UserId}", request.ProductId, userId);

                return new CartResponseDTO
                {
                    Success = true,
                    Cart = cart.Cart,
                    Message = "Product added to cart successfully"
                };
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error adding product {ProductId} to cart for user {UserId}", request.ProductId, userId);
                return new CartResponseDTO
                {
                    Success = false,
                    Message = "Failed to add product to cart"
                };
            }
        }

        public async Task<CartResponseDTO> RemoveFromCartAsync(int userId, int productId)
        {
            try
            {
                var cart = await GetUserCartAsync(userId);
                if (!cart.Success)
                {
                    return cart;
                }

                var itemToRemove = cart.Cart.Items.FirstOrDefault(i => i.ProductId == productId);
                if (itemToRemove == null)
                {
                    return new CartResponseDTO
                    {
                        Success = false,
                        Message = "Product not found in cart"
                    };
                }

                cart.Cart.Items.Remove(itemToRemove);
                CalculateCartTotals(cart.Cart);
                cart.Cart.UpdatedAt = System.DateTime.UtcNow;

                // Update in-memory storage
                _userCarts[userId] = cart.Cart;

                _logger.LogInformation("Product {ProductId} removed from cart for user {UserId}", productId, userId);

                return new CartResponseDTO
                {
                    Success = true,
                    Cart = cart.Cart,
                    Message = "Product removed from cart successfully"
                };
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error removing product {ProductId} from cart for user {UserId}", productId, userId);
                return new CartResponseDTO
                {
                    Success = false,
                    Message = "Failed to remove product from cart"
                };
            }
        }

        public Task<CartResponseDTO> UpdateCartItemAsync(int userId, UpdateCartItemRequestDTO request)
        {
            try
            {
                var cart = GetUserCartAsync(userId).Result;
                if (!cart.Success)
                {
                    return Task.FromResult(cart);
                }

                var item = cart.Cart.Items.FirstOrDefault(i => i.ProductId == request.ProductId);
                if (item == null)
                {
                    return Task.FromResult(new CartResponseDTO
                    {
                        Success = false,
                        Message = "Product not found in cart"
                    });
                }

                // For digital products, quantity is always 1
                item.Quantity = 1;
                CalculateCartTotals(cart.Cart);
                cart.Cart.UpdatedAt = System.DateTime.UtcNow;

                // Update in-memory storage
                _userCarts[userId] = cart.Cart;

                return Task.FromResult(new CartResponseDTO
                {
                    Success = true,
                    Cart = cart.Cart,
                    Message = "Cart updated successfully"
                });
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error updating cart for user {UserId}", userId);
                return Task.FromResult(new CartResponseDTO
                {
                    Success = false,
                    Message = "Failed to update cart"
                });
            }
        }

        public Task<CartResponseDTO> ClearCartAsync(int userId)
        {
            try
            {
                if (_userCarts.ContainsKey(userId))
                {
                    _userCarts[userId].Items.Clear();
                    CalculateCartTotals(_userCarts[userId]);
                    _userCarts[userId].UpdatedAt = System.DateTime.UtcNow;
                }

                _logger.LogInformation("Cart cleared for user {UserId}", userId);

                return Task.FromResult(new CartResponseDTO
                {
                    Success = true,
                    Cart = _userCarts.ContainsKey(userId) ? _userCarts[userId] : new CartDTO(),
                    Message = "Cart cleared successfully"
                });
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error clearing cart for user {UserId}", userId);
                return Task.FromResult(new CartResponseDTO
                {
                    Success = false,
                    Message = "Failed to clear cart"
                });
            }
        }

        private void CalculateCartTotals(CartDTO cart)
        {
            cart.Subtotal = cart.Items.Sum(i => i.Price * i.Quantity);
            cart.Discount = 0; // No discounts for now
            cart.Total = cart.Subtotal - cart.Discount;
        }
    }
} 