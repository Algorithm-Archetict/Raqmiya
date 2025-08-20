using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Core.Interfaces;
using Shared.DTOs.ProductDTOs;
using System.Security.Claims;
using API.Constants;
using Shared.Constants;
using AutoMapper;
using Raqmiya.Infrastructure;
using Microsoft.EntityFrameworkCore;
using System.Linq;

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
        private readonly IEmailService _emailService;
        private readonly IUserRepository _userRepository;

        public ProductsController(
            IProductService productService, 
            ILogger<ProductsController> logger, 
            IMapper mapper,
            IEmailService emailService,
            IUserRepository userRepository)
        {
            _productService = productService;
            _logger = logger;
            _mapper = mapper;
            _emailService = emailService;
            _userRepository = userRepository;
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
        /// Get products by multiple category IDs (for hierarchical category filtering).
        /// </summary>
        [HttpGet("by-categories")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetProductsByCategories([FromQuery] List<int> categoryIds, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            if (categoryIds == null || !categoryIds.Any())
            {
                return BadRequest("At least one category ID must be provided.");
            }

            _logger.LogInformation("GetProductsByCategories called with categoryIds: {CategoryIds}, pageNumber: {PageNumber}, pageSize: {PageSize}", 
                string.Join(",", categoryIds), pageNumber, pageSize);

            return Ok(await _productService.GetProductsByMultipleCategoriesAsync(categoryIds, pageNumber, pageSize));
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
            var userId = GetCurrentUserIdOrNull(); // Get user ID if logged in, null if anonymous
            var product = await _productService.GetProductDetailsByIdAsync(id, userId);
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
        /// Get products created by the current authenticated creator.
        /// </summary>
        [HttpGet("my-products")]
        [Authorize(Roles = RoleConstants.Creator)]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetMyProducts([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                var creatorId = GetCurrentUserId();
                var products = await _productService.GetCreatorProductsAsync(creatorId, pageNumber, pageSize);
                return Ok(products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting products for creator {CreatorId}", GetCurrentUserId());
                return Problem("An error occurred while retrieving your products.");
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
            catch (InvalidOperationException ex)
            {
                // e.g., duplicate permalink
                return BadRequest(ex.Message);
            }
            catch (ArgumentException ex)
            {
                // e.g., invalid category or tag IDs
                return BadRequest(ex.Message);
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
        /// Get new arrivals products (paged).
        /// </summary>
        [HttpGet("analytics/new-arrivals")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetNewArrivals([FromQuery] int count = 10, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            return Ok(await _productService.GetNewArrivalsProductsAsync(count, pageNumber, pageSize));
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
            var allowedTypes = new[] { 
                "application/pdf", 
                "application/zip", 
                "application/x-zip-compressed",
                "image/jpeg", 
                "image/jpg", 
                "image/png", 
                "image/gif",
                "video/mp4",
                "audio/mpeg",
                "audio/mp3",
                "text/plain",
                "text/csv",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
                "application/vnd.ms-powerpoint", // ppt
                "application/msword", // doc
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
                "application/vnd.ms-excel", // xls
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // xlsx
            };
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
        /// Check if the current user has purchased this product (has valid license).
        /// </summary>
        [HttpGet("{id}/purchase-status")]
        [Authorize]
        public async Task<IActionResult> CheckPurchaseStatus(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var hasPurchased = await _productService.HasUserPurchasedProductAsync(id, userId);
                
                return Ok(new { hasPurchased });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking purchase status for product {id}");
                return Problem("An error occurred while checking purchase status.");
            }
        }

        /// <summary>
        /// Get current user's review for this product.
        /// </summary>
        [HttpGet("{id}/my-review")]
        [Authorize]
        public async Task<IActionResult> GetMyReview(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var review = await _productService.GetUserReviewAsync(id, userId);
                
                if (review == null)
                {
                    return Ok(new { hasReview = false });
                }
                
                return Ok(new { 
                    hasReview = true,
                    review = new ReviewDTO
                    {
                        Id = review.Id,
                        Rating = review.Rating,
                        Comment = review.Comment,
                        userName = review.User.Username,
                        UserAvatar = review.User.ProfileImageUrl,
                        CreatedAt = review.CreatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting user review for product {id}");
                return Problem("An error occurred while getting user review.");
            }
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
                
                // Check if user has purchased the product
                var hasPurchased = await _productService.HasUserPurchasedProductAsync(id, userId);
                if (!hasPurchased)
                {
                    return BadRequest("You can only review products you have purchased.");
                }
                
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

        /// <summary>
        /// Update current user's review for a product.
        /// </summary>
        [HttpPut("{id}/reviews/my-review")]
        [Authorize]
        public async Task<IActionResult> UpdateMyReview(int id, [FromBody] ReviewDTO reviewDto)
        {
            if (reviewDto == null || reviewDto.Rating < 1 || reviewDto.Rating > 5 || string.IsNullOrWhiteSpace(reviewDto.Comment))
            {
                return BadRequest("Invalid review: rating must be 1-5 and comment must not be empty.");
            }
            try
            {
                var userId = GetCurrentUserId();
                
                // Check if user has purchased the product
                var hasPurchased = await _productService.HasUserPurchasedProductAsync(id, userId);
                if (!hasPurchased)
                {
                    return BadRequest("You can only review products you have purchased.");
                }
                
                await _productService.UpdateUserReviewAsync(id, userId, reviewDto);
                return Ok(reviewDto);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating review for product {id}");
                return Problem("An error occurred while updating the review.");
            }
        }

        /// <summary>
        /// Delete current user's review for a product.
        /// </summary>
        [HttpDelete("{id}/reviews/my-review")]
        [Authorize]
        public async Task<IActionResult> DeleteMyReview(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _productService.DeleteUserReviewAsync(id, userId);
                return Ok(new { message = "Review deleted successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting review for product {id}");
                return Problem("An error occurred while deleting the review.");
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

        // --- Analytics Endpoints for Carousels ---
        
        /// <summary>
        /// Get most wished products for carousels (without pagination).
        /// </summary>
        [HttpGet("carousel/most-wished")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetMostWishedForCarousel([FromQuery] int count = 12)
        {
            var products = await _productService.GetMostWishedProductsAsync(count);
            return Ok(products);
        }

        /// <summary>
        /// Get recommended products for carousels (without pagination).
        /// </summary>
        [HttpGet("carousel/recommended")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetRecommendedForCarousel([FromQuery] int count = 12)
        {
            var userId = GetCurrentUserIdOrNull();
            var products = await _productService.GetRecommendedProductsAsync(userId, count);
            return Ok(products);
        }

        /// <summary>
        /// Get best seller products for carousels (without pagination).
        /// </summary>
        [HttpGet("carousel/best-sellers")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetBestSellerForCarousel([FromQuery] int count = 12)
        {
            var products = await _productService.GetBestSellerProductsAsync(count);
            return Ok(products);
        }

        /// <summary>
        /// Get top rated products for carousels (without pagination).
        /// </summary>
        [HttpGet("carousel/top-rated")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetTopRatedForCarousel([FromQuery] int count = 12)
        {
            var products = await _productService.GetTopRatedProductsAsync(count);
            return Ok(products);
        }

        /// <summary>
        /// Get new arrivals for carousels (without pagination).
        /// </summary>
        [HttpGet("carousel/new-arrivals")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetNewArrivalsForCarousel([FromQuery] int count = 12)
        {
            var products = await _productService.GetNewArrivalsAsync(count);
            return Ok(products);
        }

        /// <summary>
        /// Get trending products for carousels (without pagination).
        /// </summary>
        [HttpGet("carousel/trending")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<ProductListItemDTO>), 200)]
        public async Task<IActionResult> GetTrendingForCarousel([FromQuery] int count = 12)
        {
            var products = await _productService.GetTrendingProductsAsync(count);
            return Ok(products);
        }

        /// <summary>
        /// Aggregate discover feed: returns all sections in one response to minimize requests.
        /// </summary>
        [HttpGet("discover")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDiscoverFeed([FromQuery] int countPerSection = 12)
        {
            try
            {
                var userId = GetCurrentUserIdOrNull();
                _logger.LogInformation("Getting discover feed for user {UserId}, count per section: {Count}", userId, countPerSection);

                // Call each method individually with error handling
                var mostWished = await GetSectionSafely(() => _productService.GetMostWishedProductsAsync(countPerSection), "MostWished");
                var recommended = await GetSectionSafely(() => _productService.GetRecommendedProductsAsync(userId, countPerSection), "Recommended");
                var bestSellers = await GetSectionSafely(() => _productService.GetBestSellerProductsAsync(countPerSection), "BestSellers");
                var topRated = await GetSectionSafely(() => _productService.GetTopRatedProductsAsync(countPerSection), "TopRated");
                var newArrivals = await GetSectionSafely(() => _productService.GetNewArrivalsAsync(countPerSection), "NewArrivals");
                var trending = await GetSectionSafely(() => _productService.GetTrendingProductsAsync(countPerSection), "Trending");

                _logger.LogInformation("Discover feed results - MostWished: {MW}, Recommended: {R}, BestSellers: {BS}, TopRated: {TR}, NewArrivals: {NA}, Trending: {T}", 
                    mostWished.Count(), recommended.Count(), bestSellers.Count(), topRated.Count(), newArrivals.Count(), trending.Count());

                return Ok(new
                {
                    mostWished = mostWished,
                    recommended = recommended,
                    bestSellers = bestSellers,
                    topRated = topRated,
                    newArrivals = newArrivals,
                    trending = trending
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting discover feed");
                return StatusCode(500, "Internal server error");
            }
        }

        private async Task<IEnumerable<ProductListItemDTO>> GetSectionSafely(Func<Task<IEnumerable<ProductListItemDTO>>> sectionCall, string sectionName)
        {
            try
            {
                var result = await sectionCall();
                _logger.LogInformation("{SectionName} returned {Count} products", sectionName, result.Count());
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting {SectionName} products", sectionName);
                return new List<ProductListItemDTO>();
            }
        }

        /// <summary>
        /// Debug endpoint to test individual methods
        /// </summary>
        [HttpGet("debug-sections")]
        [AllowAnonymous]
        public async Task<IActionResult> DebugSections([FromQuery] int count = 12)
        {
            try
            {
                var userId = GetCurrentUserIdOrNull();
                
                // Test each method individually
                var bestSellers = await _productService.GetBestSellerProductsAsync(count);
                var topRated = await _productService.GetTopRatedProductsAsync(count);
                var newArrivals = await _productService.GetNewArrivalsAsync(count);
                var trending = await _productService.GetTrendingProductsAsync(count);
                var recommended = await _productService.GetRecommendedProductsAsync(userId, count);
                
                return Ok(new
                {
                    bestSellersCount = bestSellers.Count(),
                    topRatedCount = topRated.Count(),
                    newArrivalsCount = newArrivals.Count(),
                    trendingCount = trending.Count(),
                    recommendedCount = recommended.Count(),
                    bestSellers = bestSellers.Take(2),
                    topRated = topRated.Take(2),
                    newArrivals = newArrivals.Take(2),
                    trending = trending.Take(2),
                    recommended = recommended.Take(2)
                });
            }
            catch (Exception ex)
            {
                return Ok(new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        /// <summary>
        /// Test endpoint to demonstrate personalization with different user IDs
        /// </summary>
        [HttpGet("analytics/test-personalization")]
        [AllowAnonymous]
        public async Task<IActionResult> TestPersonalization([FromQuery] int? testUserId = null, [FromQuery] int count = 5)
        {
            try
            {
                var userId = testUserId ?? GetCurrentUserIdOrNull();
                _logger.LogInformation("Testing personalization for user ID: {UserId}", userId);
                
                var recommended = await _productService.GetRecommendedProductsAsync(userId, count);
                
                return Ok(new
                {
                    testUserId = userId,
                    isAuthenticated = userId.HasValue,
                    recommendedCount = recommended.Count(),
                    recommended = recommended.Select(p => new { 
                        id = p.Id, 
                        name = p.Name, 
                        category = p.Category?.Name,
                        price = p.Price,
                        rating = p.AverageRating
                    })
                });
            }
            catch (Exception ex)
            {
                return Ok(new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        /// <summary>
        /// Get all available tags.
        /// </summary>
        [HttpGet("tags")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(List<TagDTO>), 200)]
        public async Task<IActionResult> GetAllTags()
        {
            var tags = await _productService.GetAllTagsAsync();
            return Ok(tags);
        }

        /// <summary>
        /// Get tags for specific categories.
        /// </summary>
        [HttpGet("tags/by-categories")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(List<TagDTO>), 200)]
        public async Task<IActionResult> GetTagsForCategories([FromQuery] List<int> categoryIds)
        {
            if (categoryIds == null || !categoryIds.Any())
            {
                return BadRequest("At least one category ID must be provided.");
            }

            var tags = await _productService.GetTagsForCategoriesAsync(categoryIds);
            return Ok(tags);
        }

        // --- Helpers ---
        protected int GetCurrentUserId()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                throw new UnauthorizedAccessException("User ID claim missing or invalid.");
            return userId;
        }

        protected int? GetCurrentUserIdOrNull()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                return null; // Return null for anonymous users
            return userId;
        }

        /// <summary>
        /// Get receipt for a specific order.
        /// </summary>
        [HttpGet("receipt/{orderId}")]
        [Authorize]
        [ProducesResponseType(typeof(ReceiptDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetReceipt(int orderId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var receipt = await _productService.GetReceiptAsync(orderId, userId);
                if (receipt == null) return NotFound();
                return Ok(receipt);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting receipt for order {orderId}");
                return Problem("An error occurred while retrieving the receipt.");
            }
        }

        /// <summary>
        /// Resend receipt email for a specific order.
        /// </summary>
        [HttpPost("receipt/{orderId}/resend")]
        [Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> ResendReceipt(int orderId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var receipt = await _productService.GetReceiptAsync(orderId, userId);
                if (receipt == null) return NotFound();

                // Get user information for email
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null) return NotFound();

                // Send receipt email
                var emailSent = await _emailService.SendReceiptEmailAsync(user.Email, user.Username, receipt);
                
                if (emailSent)
                {
                    _logger.LogInformation($"Receipt email resent successfully for order {orderId} to user {userId}");
                    return Ok(new { success = true, message = "Receipt email has been sent successfully." });
                }
                else
                {
                    _logger.LogWarning($"Failed to send receipt email for order {orderId} to user {userId}");
                    return BadRequest(new { success = false, message = "Failed to send receipt email. Please try again later." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error resending receipt for order {orderId}");
                return Problem("An error occurred while resending the receipt.");
            }
        }

        /// <summary>
        /// Get products by creator ID
        /// </summary>
        [HttpGet("creator/{creatorId}/products")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(List<ProductListItemDTO>), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetProductsByCreator(int creatorId)
        {
            try
            {
                var currentUserId = GetCurrentUserIdOrNull(); // Get current user ID (can be null for anonymous users)
                var products = await _productService.GetProductsByCreatorAsync(creatorId, currentUserId);
                return Ok(products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting products for creator {CreatorId}", creatorId);
                return StatusCode(500, new { success = false, message = "An error occurred while getting products" });
            }
        }

        // Returns count of PUBLIC products for a creator (excludes soft-deleted and private)
        [HttpGet("creator/{creatorId:int}/public-count")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicCountForCreator(int creatorId, [FromServices] RaqmiyaDbContext dbContext)
        {
            var count = await dbContext.Products
                .Where(p => p.CreatorId == creatorId && p.IsPublic && !p.IsDeleted)
                .CountAsync();
            return Ok(new { count });
        }
    }
}
