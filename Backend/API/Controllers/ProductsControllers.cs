using AutoMapper;
using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Raqmiya.Infrastructure;
using API.Constants;
using Shared.Constants;
using Shared.DTOs.ProductDTOs;

namespace API.Controllers
{
    /// <summary>
    /// Controller for product management, search, wishlist, and analytics.
    /// </summary>
    [ApiController]
    [Route(ProductRoutes.Products)]
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _productService;
        private readonly ILogger<ProductsController> _logger;
        private readonly IMapper _mapper;

        public ProductsController(IProductService productService, ILogger<ProductsController> logger, IMapper mapper)
        {
            _productService = productService;
            _logger = logger;
            _mapper = mapper;
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

            // Log the product details being returned
            _logger.LogInformation("GetProductById - Product ID: {ProductId}, CoverImageUrl: {CoverImageUrl}, ThumbnailImageUrl: {ThumbnailImageUrl}",
                id, product.CoverImageUrl, product.ThumbnailImageUrl);

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
            try
            {
                var userId = GetCurrentUserId();
                var product = await _productService.GetProductDetailsByPermalinkAsync(permalink, userId);
                if (product == null) return NotFound();
                return Ok(product);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, LogMessages.ProductGetByPermalinkError);
                return Problem(ErrorMessages.ProductGetByPermalink);
            }
        }

        /// <summary>
        /// Create a new product (creator only).
        /// </summary>
        [HttpPost]
        [Authorize(Roles = RoleConstants.Creator)]
        [ProducesResponseType(typeof(ProductDetailDTO), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> CreateProduct([FromBody] ProductCreateRequestDTO request)
        {
            // ModelState check removed; FluentValidation will handle validation errors
            try
            {
                var creatorId = GetCurrentUserId();
                var product = await _productService.CreateProductAsync(creatorId, request);
                return CreatedAtAction(nameof(GetProductById), new { id = product.Id }, product);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating product");
                return Problem("An error occurred while creating the product.");
            }
        }

        /// <summary>
        /// Update an existing product (creator only).
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = RoleConstants.Creator)]
        [ProducesResponseType(typeof(ProductDetailDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] ProductUpdateRequestDTO request)
        {
            if (id != request.Id) return BadRequest("Product ID in URL does not match ID in request body.");
            // ModelState check removed; FluentValidation will handle validation errors
            try
            {
                var creatorId = GetCurrentUserId();
                var updatedProduct = await _productService.UpdateProductAsync(id, creatorId, request);
                return Ok(updatedProduct);
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
            catch (ArgumentException ex) { return BadRequest(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating product {ProductId}", id);
                return Problem("An error occurred while updating the product.");
            }
        }

        /// <summary>
        /// Delete a product (creator only).
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = RoleConstants.Creator)]
        [ProducesResponseType(204)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            try
            {
                var creatorId = GetCurrentUserId();
                await _productService.DeleteProductAsync(id, creatorId);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting product {ProductId}", id);
                return Problem("An error occurred while deleting the product.");
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
            try
            {
                var userId = GetCurrentUserId();
                await _productService.AddProductToWishlistAsync(userId, id);
                return Ok("Product added to wishlist.");
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding product {ProductId} to wishlist", id);
                return Problem("An error occurred while adding to wishlist.");
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
            try
            {
                await _productService.RemoveProductFromWishlistAsync(userId, id);
                return Ok("Product removed from wishlist.");
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing product {ProductId} from wishlist", id);
                return Problem("An error occurred while removing from wishlist.");
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
            try
            {
                var userId = GetCurrentUserId();
                return Ok(await _productService.GetUserWishlistAsync(userId, pageNumber, pageSize));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting wishlist for user");
                return Problem("An error occurred while fetching the wishlist.");
            }
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

        /// <summary>
        /// Upload a file for a product. Files are stored in wwwroot/uploads/products/{productId}/.
        /// Only the product's creator can upload files. Allowed types: PDF, ZIP, JPG, PNG, MP4, etc.
        /// </summary>
        [HttpPost("{id}/files")]
        [Authorize(Roles = "Creator")]
        [RequestSizeLimit(50_000_000)] // 50 MB limit
        [ProducesResponseType(typeof(FileDTO), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> UploadProductFile(int id, [FromForm] IFormFile file)
        {
            var creatorId = GetCurrentUserId();
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");
            var allowedTypes = new[] { "application/pdf", "application/zip", "image/jpeg", "image/png", "video/mp4" };
            if (!allowedTypes.Contains(file.ContentType))
                return BadRequest("File type not allowed.");
            var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), FileStorageConstants.ProductUploadsRoot, id.ToString());
            Directory.CreateDirectory(uploadsRoot);
            var fileName = Path.GetRandomFileName() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(uploadsRoot, fileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            var fileUrl = $"/{FileStorageConstants.UploadsFolder}/products/{id}/{fileName}";

            // For frontend access, we need to include the backend base URL
            var backendBaseUrl = $"{Request.Scheme}://{Request.Host}";
            var fullFileUrl = $"{backendBaseUrl}{fileUrl}";

            // Log the file upload details for debugging
            _logger.LogInformation("File uploaded successfully. Product ID: {ProductId}, File: {FileName}, URL: {FileUrl}, Full URL: {FullFileUrl}, Size: {Size} bytes, Type: {ContentType}",
                id, fileName, fileUrl, fullFileUrl, file.Length, file.ContentType);

            var fileDto = await _productService.AddProductFileAsync(id, creatorId, fileName, fullFileUrl, file.Length, file.ContentType);

            return CreatedAtAction(nameof(GetProductFiles), new { id }, fileDto);
        }

        /// <summary>
        /// Upload an image for a product (cover or thumbnail). Images are stored in wwwroot/uploads/products/{productId}/images/.
        /// Only the product's creator can upload images. Allowed types: JPG, PNG, GIF.
        /// </summary>
        [HttpPost("{id}/images")]
        [Authorize(Roles = "Creator")]
        [RequestSizeLimit(10_000_000)] // 10 MB limit for images
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> UploadProductImage(int id, [FromForm] IFormFile image, [FromQuery] string type = "cover")
        {
            var creatorId = GetCurrentUserId();
            if (image == null || image.Length == 0)
                return BadRequest("No image uploaded.");

            var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif" };
            if (!allowedTypes.Contains(image.ContentType))
                return BadRequest("Image type not allowed. Only JPG, PNG, and GIF are supported.");

            if (type != "cover" && type != "thumbnail")
                return BadRequest("Image type must be 'cover' or 'thumbnail'.");

            var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), FileStorageConstants.ProductUploadsRoot, id.ToString(), "images");
            Directory.CreateDirectory(uploadsRoot);
            var fileName = Path.GetRandomFileName() + Path.GetExtension(image.FileName);
            var filePath = Path.Combine(uploadsRoot, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await image.CopyToAsync(stream);
            }

            var imageUrl = $"/{FileStorageConstants.UploadsFolder}/products/{id}/images/{fileName}";

            // For frontend access, we need to include the backend base URL
            var backendBaseUrl = $"{Request.Scheme}://{Request.Host}";
            var fullImageUrl = $"{backendBaseUrl}{imageUrl}";

            // Log the upload details for debugging
            _logger.LogInformation("Image uploaded successfully. Product ID: {ProductId}, Type: {Type}, File: {FileName}, URL: {ImageUrl}, Full URL: {FullImageUrl}, Size: {Size} bytes, Scheme: {Scheme}, Host: {Host}",
                id, type, fileName, imageUrl, fullImageUrl, image.Length, Request.Scheme, Request.Host);

            // Update the product with the new image URL (store the full URL)
            var product = await _productService.GetByIdAsync(id);
            if (product == null)
                return NotFound("Product not found.");

            if (product.CreatorId != creatorId)
                return Forbid("Only the product creator can upload images.");

            // Log the current state before update
            _logger.LogInformation("Before update - Product ID: {ProductId}, Current CoverImageUrl: {CurrentCoverUrl}, Current ThumbnailImageUrl: {CurrentThumbnailUrl}",
                id, product.CoverImageUrl, product.ThumbnailImageUrl);

            if (type.ToLower() == "cover")
                product.CoverImageUrl = fullImageUrl;
            else if (type.ToLower() == "thumbnail")
                product.ThumbnailImageUrl = fullImageUrl;
            else
                return BadRequest("Invalid image type. Use 'cover' or 'thumbnail'.");

            // Log the state after setting the URL
            _logger.LogInformation("After setting URL - Product ID: {ProductId}, New CoverImageUrl: {NewCoverUrl}, New ThumbnailImageUrl: {NewThumbnailUrl}",
                id, product.CoverImageUrl, product.ThumbnailImageUrl);

            await _productService.UpdateAsync(product);

            // Log the state after database update
            _logger.LogInformation("After database update - Product ID: {ProductId}, Final CoverImageUrl: {FinalCoverUrl}, Final ThumbnailImageUrl: {FinalThumbnailUrl}",
                id, product.CoverImageUrl, product.ThumbnailImageUrl);

            return Ok(new { url = fullImageUrl });
        }

        /// <summary>
        /// List all files for a product.
        /// </summary>
        [HttpGet("{id}/files")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(List<FileDTO>), 200)]
        public async Task<IActionResult> GetProductFiles(int id)
        {
            var files = await _productService.GetProductFilesAsync(id);
            return Ok(files);
        }

        /// <summary>
        /// Delete a file from a product (creator only).
        /// </summary>
        [HttpDelete("{id}/files/{fileId}")]
        [Authorize(Roles = "Creator")]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteProductFile(int id, int fileId)
        {
            var creatorId = GetCurrentUserId();
            var result = await _productService.DeleteProductFileAsync(id, fileId, creatorId);
            if (!result) return NotFound();
            // Optionally: delete the file from disk as well
            return Ok("File deleted.");
        }

        /// <summary>
        /// Add a review to a product.
        /// </summary>
        [HttpPost("{id}/reviews")]
        [Authorize] // Require authentication to post reviews
        public async Task<IActionResult> AddReview(int id, [FromBody] ReviewDTO reviewDto)
        {
            if (reviewDto == null || reviewDto.Rating < 1 || reviewDto.Rating > 5 || string.IsNullOrWhiteSpace(reviewDto.Comment))
            {
                return BadRequest("Invalid review: rating must be 1-5 and comment must not be empty.");
            }
            try
            {
                var userId = GetCurrentUserId();
                await _productService.AddReviewAsync(id, userId, reviewDto);

                // Return the updated ReviewDTO with the user's name and avatar
                return Ok(reviewDto);
            }
            catch (InvalidOperationException ex)
            {
                // This is for cases like "already reviewed"
                return BadRequest(ex.Message);
            }
            catch (ArgumentException ex)
            {
                // This is for validation errors
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error adding review for product {id}");
                return Problem("An error occurred while adding the review.");
            }
        }

        // --- Admin Endpoints ---

        /// <summary>
        /// List products by status (admin only).
        /// </summary>
        [HttpGet("admin/by-status")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetProductsByStatus([FromQuery] string status = ProductStatus.Pending, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            return Ok(await _productService.GetProductsByStatusAsync(status, pageNumber, pageSize));
        }

        /// <summary>
        /// Approve a product (admin only).
        /// </summary>
        [HttpPost("admin/{id}/approve")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> ApproveProduct(int id)
        {
            var adminId = GetCurrentUserId();
            var result = await _productService.ApproveProductAsync(id, adminId);
            if (!result) return NotFound();
            return Ok("Product approved and published.");
        }

        /// <summary>
        /// Reject a product (admin only).
        /// </summary>
        [HttpPost("admin/{id}/reject")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> RejectProduct(int id, [FromBody] ProductModerationRequestDTO request)
        {
            if (request.Action?.ToLower() != ProductModerationActions.Reject || string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest("Rejection reason is required.");
            var adminId = GetCurrentUserId();
            var result = await _productService.RejectProductAsync(id, adminId, request.Reason!);
            if (!result) return NotFound();
            return Ok("Product rejected.");
        }

        // --- Helpers ---
        protected int GetCurrentUserId()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                throw new UnauthorizedAccessException("User ID claim missing or invalid.");
            return userId;
        }
    }
}
