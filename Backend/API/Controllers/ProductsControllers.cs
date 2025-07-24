using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs.ProductDTOs;
using System.Security.Claims;

namespace API.Controllers
{
    //public class ProductsControllers : Controller
    //{
    //    public IActionResult Index()
    //    {
    //        return View();
    //    }
    //}


    [ApiController]
    [Route("api/[controller]")] // api/Products
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _productService;
        private readonly ILogger<ProductsController> _logger;

        public ProductsController(IProductService productService, ILogger<ProductsController> logger)
        {
            _productService = productService;
            _logger = logger;
        }

        // Helper to get current authenticated user's ID
        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                return userId;
            }
            return null;
        }

        // Helper to get current user's IP address
        private string? GetClientIpAddress()
        {
            return HttpContext.Connection.RemoteIpAddress?.ToString();
        }

        // --- Public Product Listings ---

        /// <summary>
        /// Gets a paginated list of all published and public products.
        /// </summary>
        [HttpGet] // GET api/products?pageNumber=1&pageSize=10
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetPublishedProducts(int pageNumber = 1, int pageSize = 10)
        {
            if (pageNumber < 1 || pageSize < 1)
            {
                return BadRequest("Page number and page size must be positive.");
            }
            try
            {
                var products = await _productService.GetPublishedProductsAsync(pageNumber, pageSize);
                return Ok(products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting published products.");
                return StatusCode(500, "An error occurred while retrieving products.");
            }
        }

        /// <summary>
        /// Gets details for a single product by its permalink. Records a view.
        /// </summary>
        [HttpGet("{permalink}")] // GET api/products/ultimate-productivity-guide
        [AllowAnonymous]
        [ProducesResponseType(typeof(ProductDetailDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetProductDetailsByPermalink(string permalink)
        {
            try
            {
                var userId = GetCurrentUserId();
                var ipAddress = GetClientIpAddress();
                var product = await _productService.GetProductDetailsByPermalinkAsync(permalink, userId);

                if (product == null)
                {
                    return NotFound();
                }

                // Product view recording is handled by the service now.

                return Ok(product);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting product details for permalink {Permalink}.", permalink);
                return StatusCode(500, "An error occurred while retrieving product details.");
            }
        }

        /// <summary>
        /// Gets a paginated list of most wished products.
        /// </summary>
        [HttpGet("most-wished")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetMostWished(int count = 10, int pageNumber = 1, int pageSize = 10)
        {
            try
            {
                var products = await _productService.GetMostWishedProductsAsync(count, pageNumber, pageSize);
                return Ok(products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting most wished products.");
                return StatusCode(500, "An error occurred.");
            }
        }

        // Add similar endpoints for TopRated, BestSelling, Trendy

        // --- Creator-Specific Product Management ---

        /// <summary>
        /// Gets a paginated list of products owned by the authenticated creator.
        /// </summary>
        [HttpGet("my-products")] // GET api/products/my-products
        [Authorize] // Requires authentication
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetMyProducts(int pageNumber = 1, int pageSize = 10)
        {
            var creatorId = GetCurrentUserId();
            if (!creatorId.HasValue) return Unauthorized();

            try
            {
                var products = await _productService.GetCreatorProductsAsync(creatorId.Value, pageNumber, pageSize);
                return Ok(products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting creator products for user {CreatorId}.", creatorId);
                return StatusCode(500, "An error occurred while retrieving your products.");
            }
        }

        /// <summary>
        /// Creates a new product.
        /// </summary>
        [HttpPost] // POST api/products
        [Authorize(Roles = "Creator")] // Only creators can create products
        [ProducesResponseType(typeof(ProductDetailDTO), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> CreateProduct([FromBody] ProductCreateRequestDTO request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var creatorId = GetCurrentUserId();
            if (!creatorId.HasValue) return Unauthorized();

            try
            {
                var newProduct = await _productService.CreateProductAsync(creatorId.Value, request);
                // Return 201 Created with the location of the new resource
                return CreatedAtAction(nameof(GetProductDetailsByPermalink), new { permalink = newProduct.Permalink }, newProduct);
            }
            catch (InvalidOperationException ex) // For permalink conflict or other business rules
            {
                ModelState.AddModelError("", ex.Message);
                return BadRequest(ModelState);
            }
            catch (ArgumentException ex) // For invalid category/tag IDs
            {
                ModelState.AddModelError("", ex.Message);
                return BadRequest(ModelState);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating product for creator {CreatorId}.", creatorId);
                return StatusCode(500, "An error occurred while creating the product.");
            }
        }

        /// <summary>
        /// Updates an existing product.
        /// </summary>
        [HttpPut("{productId}")] // PUT api/products/123
        [Authorize(Roles = "Creator")]
        [ProducesResponseType(typeof(ProductDetailDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateProduct(int productId, [FromBody] ProductUpdateRequestDTO request)
        {
            if (productId != request.Id)
            {
                return BadRequest("Product ID in URL does not match ID in request body.");
            }
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var creatorId = GetCurrentUserId();
            if (!creatorId.HasValue) return Unauthorized();

            try
            {
                var updatedProduct = await _productService.UpdateProductAsync(productId, creatorId.Value, request);
                return Ok(updatedProduct);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message); // Return 403 Forbidden
            }
            catch (InvalidOperationException ex) // For permalink conflict or other business rules
            {
                ModelState.AddModelError("", ex.Message);
                return BadRequest(ModelState);
            }
            catch (ArgumentException ex) // For invalid category/tag IDs
            {
                ModelState.AddModelError("", ex.Message);
                return BadRequest(ModelState);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating product {ProductId} for creator {CreatorId}.", productId, creatorId);
                return StatusCode(500, "An error occurred while updating the product.");
            }
        }

        /// <summary>
        /// Deletes a product.
        /// </summary>
        [HttpDelete("{productId}")] // DELETE api/products/123
        [Authorize(Roles = "Creator")]
        [ProducesResponseType(204)] // No Content
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteProduct(int productId)
        {
            var creatorId = GetCurrentUserId();
            if (!creatorId.HasValue) return Unauthorized();

            try
            {
                await _productService.DeleteProductAsync(productId, creatorId.Value);
                return NoContent(); // 204 No Content for successful deletion
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting product {ProductId} for creator {CreatorId}.", productId, creatorId);
                return StatusCode(500, "An error occurred while deleting the product.");
            }
        }

        // --- Wishlist Actions ---

        /// <summary>
        /// Adds a product to the authenticated user's wishlist.
        /// </summary>
        [HttpPost("{productId}/wishlist")] // POST api/products/123/wishlist
        [Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> AddToWishlist(int productId)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            try
            {
                await _productService.AddProductToWishlistAsync(userId.Value, productId);
                return Ok("Product added to wishlist.");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message); // Already in wishlist
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding product {ProductId} to user {UserId}'s wishlist.", productId, userId);
                return StatusCode(500, "An error occurred while adding to wishlist.");
            }
        }

        /// <summary>
        /// Removes a product from the authenticated user's wishlist.
        /// </summary>
        [HttpDelete("{productId}/wishlist")] // DELETE api/products/123/wishlist
        [Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> RemoveFromWishlist(int productId)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            try
            {
                await _productService.RemoveProductFromWishlistAsync(userId.Value, productId);
                return Ok("Product removed from wishlist.");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message); // Not in wishlist
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing product {ProductId} from user {UserId}'s wishlist.", productId, userId);
                return StatusCode(500, "An error occurred while removing from wishlist.");
            }
        }

        /// <summary>
        /// Gets the authenticated user's wishlist.
        /// </summary>
        [HttpGet("my-wishlist")] // GET api/products/my-wishlist
        [Authorize]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetMyWishlist(int pageNumber = 1, int pageSize = 10)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            try
            {
                var wishlist = await _productService.GetUserWishlistAsync(userId.Value, pageNumber, pageSize);
                return Ok(wishlist);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user {UserId}'s wishlist.", userId);
                return StatusCode(500, "An error occurred while retrieving wishlist.");
            }
        }

        /// <summary>
        /// Gets all categories for product forms.
        /// </summary>
        [HttpGet("categories")]
        [ProducesResponseType(typeof(List<CategoryDTO>), 200)]
        public async Task<IActionResult> GetAllCategories()
        {
            try
            {
                var categories = await _productService.GetAllCategoriesAsync();
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all categories.");
                return StatusCode(500, "An error occurred while retrieving categories.");
            }
        }

        /// <summary>
        /// Gets all tags for product forms.
        /// </summary>
        [HttpGet("tags")]
        [ProducesResponseType(typeof(List<TagDTO>), 200)]
        public async Task<IActionResult> GetAllTags()
        {
            try
            {
                var tags = await _productService.GetAllTagsAsync();
                return Ok(tags);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all tags.");
                return StatusCode(500, "An error occurred while retrieving tags.");
            }
        }
    }
}
