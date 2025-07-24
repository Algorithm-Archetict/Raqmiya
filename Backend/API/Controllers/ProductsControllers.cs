using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Core.Interfaces;
using Shared.DTOs.ProductDTOs;
using System.Security.Claims;

namespace API.Controllers
{
    /// <summary>
    /// Controller for product management, search, wishlist, and analytics.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _productService;
        private readonly ILogger<ProductsController> _logger;

        public ProductsController(IProductService productService, ILogger<ProductsController> logger)
        {
            _productService = productService;
            _logger = logger;
        }

        /// <summary>
        /// List products with optional search, category, tag, and pagination.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetProducts([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null, [FromQuery] int? categoryId = null, [FromQuery] int? tagId = null)
        {
            if (categoryId.HasValue)
                return Ok(await _productService.GetProductsByCategoryAsync(categoryId.Value, pageNumber, pageSize));
            if (tagId.HasValue)
                return Ok(await _productService.GetProductsByTagAsync(tagId.Value, pageNumber, pageSize));
            if (!string.IsNullOrWhiteSpace(search))
                return Ok(await _productService.SearchProductsAsync(search, pageNumber, pageSize));
            return Ok(await _productService.GetPublishedProductsAsync(pageNumber, pageSize));
        }

        /// <summary>
        /// Get product details by ID.
        /// </summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ProductDetailDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetProductById(int id)
        {
            var product = await _productService.GetProductDetailsByIdAsync(id);
            if (product == null) return NotFound();
            return Ok(product);
        }

        /// <summary>
        /// Get product details by permalink.
        /// </summary>
        [HttpGet("permalink/{permalink}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ProductDetailDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetProductByPermalink(string permalink)
        {
            var userId = GetCurrentUserId();
            var product = await _productService.GetProductDetailsByPermalinkAsync(permalink, userId);
            if (product == null) return NotFound();
            return Ok(product);
        }

        /// <summary>
        /// Create a new product (creator only).
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Creator")]
        [ProducesResponseType(typeof(ProductDetailDTO), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> CreateProduct([FromBody] ProductCreateRequestDTO request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var creatorId = GetCurrentUserId();
            if (!creatorId.HasValue) return Unauthorized();
            try
            {
                var product = await _productService.CreateProductAsync(creatorId.Value, request);
                return CreatedAtAction(nameof(GetProductById), new { id = product.Id }, product);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating product for creator {CreatorId}.", creatorId);
                return StatusCode(500, "An error occurred while creating the product.");
            }
        }

        /// <summary>
        /// Update an existing product (creator only).
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Creator")]
        [ProducesResponseType(typeof(ProductDetailDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] ProductUpdateRequestDTO request)
        {
            if (id != request.Id) return BadRequest("Product ID in URL does not match ID in request body.");
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var creatorId = GetCurrentUserId();
            if (!creatorId.HasValue) return Unauthorized();
            try
            {
                var updatedProduct = await _productService.UpdateProductAsync(id, creatorId.Value, request);
                return Ok(updatedProduct);
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { ModelState.AddModelError("", ex.Message); return BadRequest(ModelState); }
            catch (ArgumentException ex) { ModelState.AddModelError("", ex.Message); return BadRequest(ModelState); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating product {ProductId} for creator {CreatorId}.", id, creatorId);
                return StatusCode(500, "An error occurred while updating the product.");
            }
        }

        /// <summary>
        /// Delete a product (creator only).
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Creator")]
        [ProducesResponseType(204)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var creatorId = GetCurrentUserId();
            if (!creatorId.HasValue) return Unauthorized();
            try
            {
                await _productService.DeleteProductAsync(id, creatorId.Value);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting product {ProductId} for creator {CreatorId}.", id, creatorId);
                return StatusCode(500, "An error occurred while deleting the product.");
            }
        }

        /// <summary>
        /// Add a product to the authenticated user's wishlist.
        /// </summary>
        [HttpPost("{id}/wishlist")]
        [Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> AddToWishlist(int id)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();
            try
            {
                await _productService.AddProductToWishlistAsync(userId.Value, id);
                return Ok("Product added to wishlist.");
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding product {ProductId} to user {UserId}'s wishlist.", id, userId);
                return StatusCode(500, "An error occurred while adding to wishlist.");
            }
        }

        /// <summary>
        /// Remove a product from the authenticated user's wishlist.
        /// </summary>
        [HttpDelete("{id}/wishlist")]
        [Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> RemoveFromWishlist(int id)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();
            try
            {
                await _productService.RemoveProductFromWishlistAsync(userId.Value, id);
                return Ok("Product removed from wishlist.");
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing product {ProductId} from user {UserId}'s wishlist.", id, userId);
                return StatusCode(500, "An error occurred while removing from wishlist.");
            }
        }

        /// <summary>
        /// Get the authenticated user's wishlist.
        /// </summary>
        [HttpGet("my-wishlist")]
        [Authorize]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetMyWishlist([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();
            return Ok(await _productService.GetUserWishlistAsync(userId.Value, pageNumber, pageSize));
        }

        // --- Analytics Endpoints ---

        /// <summary>
        /// Get most wished products.
        /// </summary>
        [HttpGet("analytics/most-wished")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetMostWished([FromQuery] int count = 10, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            return Ok(await _productService.GetMostWishedProductsAsync(count, pageNumber, pageSize));
        }

        /// <summary>
        /// Get top rated products.
        /// </summary>
        [HttpGet("analytics/top-rated")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetTopRated([FromQuery] int count = 10, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            return Ok(await _productService.GetTopRatedProductsAsync(count, pageNumber, pageSize));
        }

        /// <summary>
        /// Get best selling products.
        /// </summary>
        [HttpGet("analytics/best-selling")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetBestSelling([FromQuery] int count = 10, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            return Ok(await _productService.GetBestSellingProductsAsync(count, pageNumber, pageSize));
        }

        /// <summary>
        /// Get trendy products.
        /// </summary>
        [HttpGet("analytics/trendy")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetTrendy([FromQuery] int count = 10, [FromQuery] int daysBack = 30, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            return Ok(await _productService.GetTrendyProductsAsync(count, daysBack, pageNumber, pageSize));
        }

        // --- Helpers ---
        private int? GetCurrentUserId()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(userIdStr, out int userId)) return userId;
            return null;
        }
    }
}
