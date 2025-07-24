using Raqmiya.Infrastructure;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Raqmiya.Infrastructure
{
    /// <summary>
    /// Repository interface for product data access and management.
    /// </summary>
    public interface IProductRepository
    {
        /// <summary>Gets a product by its ID.</summary>
        Task<Product?> GetByIdAsync(int id);

        /// <summary>Gets a product with all related details by permalink.</summary>
        Task<Product?> GetProductWithAllDetailsByPermalinkAsync(string permalink);

        /// <summary>Gets a paged list of all products.</summary>
        Task<IEnumerable<Product>> GetAllAsync(int pageNumber, int pageSize);

        /// <summary>Adds a new product.</summary>
        Task AddAsync(Product product);

        /// <summary>Updates an existing product.</summary>
        Task UpdateAsync(Product product);

        /// <summary>Deletes a product by ID.</summary>
        Task DeleteAsync(int id);

        /// <summary>Checks if a product exists by ID.</summary>
        Task<bool> ExistsAsync(int id);

        /// <summary>Checks if a permalink exists for any product.</summary>
        Task<bool> PermalinkExistsAsync(string permalink);

        /// <summary>Gets a product with all related details by ID.</summary>
        Task<Product?> GetProductWithAllDetailsAsync(int productId);

        /// <summary>Gets a list of products with their creators and files.</summary>
        Task<List<Product>> GetProductsWithCreatorAndFilesAsync();

        /// <summary>Gets products by category ID with optional paging.</summary>
        Task<List<Product>> GetProductsByCategoryIdAsync(int categoryId, int? pageNumber = 1, int? pageSize = 10);

        /// <summary>Gets products by tag ID with optional paging.</summary>
        Task<List<Product>> GetProductsByTagIdAsync(int tagId, int? pageNumber = 1, int? pageSize = 10);

        /// <summary>Searches products by a search term with optional paging.</summary>
        Task<List<Product>> SearchProductsAsync(string searchTerm, int? pageNumber = 1, int? pageSize = 10);

        /// <summary>Gets products by creator ID with optional paging.</summary>
        Task<List<Product>> GetProductsByCreatorIdAsync(int creatorId, int? pageNumber = 1, int? pageSize = 10);

        /// <summary>Gets published products with optional paging.</summary>
        Task<List<Product>> GetPublishedProductsAsync(int? pageNumber = 1, int? pageSize = 10);

        /// <summary>Gets published products with paging (alternative signature).</summary>
        Task<IEnumerable<Product>> GetPublishedProductsAsync(int pageNumber, int pageSize);

        /// <summary>Gets products by creator ID with paging (alternative signature).</summary>
        Task<IEnumerable<Product>> GetProductsByCreatorIdAsync(int creatorId, int pageNumber, int pageSize);

        /// <summary>Searches products by a search term with paging (alternative signature).</summary>
        Task<IEnumerable<Product>> SearchProductsAsync(string searchTerm, int pageNumber, int pageSize);

        /// <summary>Gets products by category ID with paging (alternative signature).</summary>
        Task<IEnumerable<Product>> GetProductsByCategoryIdAsync(int categoryId, int pageNumber, int pageSize);

        /// <summary>Gets products by tag ID with paging (alternative signature).</summary>
        Task<IEnumerable<Product>> GetProductsByTagIdAsync(int tagId, int pageNumber, int pageSize);

        // Tag Management for Products
        Task AddProductTagAsync(int productId, int tagId);
        Task RemoveProductTagAsync(int productId, int tagId);
        Task<bool> ProductTagExistsAsync(int productId, int tagId);
        Task<List<Tag>> GetTagsForProductAsync(int productId);
        Task<List<Tag>> GetAvailableTagsForProductCategoriesAsync(int productId);

        // Wishlist operations
        Task AddProductToWishlistAsync(int userId, int productId);
        Task RemoveProductFromWishlistAsync(int userId, int productId);
        Task<bool> IsProductInUserWishlistAsync(int userId, int productId);
        Task<IEnumerable<Product>> GetUserWishlistAsync(int userId, int pageNumber, int pageSize);

        /// <summary>Gets the count of published products.</summary>
        Task<int> GetPublishedProductsCountAsync();
        /// <summary>Gets the count of products by a specific creator.</summary>
        Task<int> GetProductsByCreatorCountAsync(int creatorId);
        /// <summary>Gets the count of wishlist items for a user.</summary>
        Task<int> GetUserWishlistCountAsync(int userId);
        /// <summary>Records a product view for analytics.</summary>
        Task RecordProductViewAsync(int productId, int? userId, string? ipAddress);
        /// <summary>Gets the most wished products.</summary>
        Task<IEnumerable<Product>> GetMostWishedProductsAsync(int count, int pageNumber, int pageSize);
        /// <summary>Gets the top rated products.</summary>
        Task<IEnumerable<Product>> GetTopRatedProductsAsync(int count, int pageNumber, int pageSize);
        /// <summary>Gets the best selling products.</summary>
        Task<IEnumerable<Product>> GetBestSellingProductsAsync(int count, int pageNumber, int pageSize);
        /// <summary>Gets the trendy products based on recent activity.</summary>
        Task<IEnumerable<Product>> GetTrendyProductsAsync(int count, int daysBack, int pageNumber, int pageSize);

        // --- Product File Management ---
        Task<AddedFile> AddProductFileAsync(int productId, string name, string fileUrl, long size, string contentType);
        Task<List<AddedFile>> GetProductFilesAsync(int productId);
        Task<bool> DeleteProductFileAsync(int productId, int fileId);

        // --- Admin Moderation ---
        Task<List<Product>> GetProductsByStatusAsync(string status, int pageNumber, int pageSize);
        Task<bool> ApproveProductAsync(int productId, int adminId);
        Task<bool> RejectProductAsync(int productId, int adminId, string reason);
        Task AddModerationLogAsync(ModerationLog log);
    }
}
