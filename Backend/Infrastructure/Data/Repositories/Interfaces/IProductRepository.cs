

namespace Raqmiya.Infrastructure
{

    public interface IProductRepository
    {
        // Basic CRUD Operations
        Task<Product?> GetByIdAsync(int id);
        // Task<Product?> GetProductWithAllDetailsAsync(int id);
        Task<Product?> GetProductWithAllDetailsByPermalinkAsync(string permalink); // NEW
        //Task<List<Product>> GetAllAsync();
        Task<IEnumerable<Product>> GetAllAsync(int pageNumber, int pageSize);
        Task AddAsync(Product product);
        Task UpdateAsync(Product product);
        Task DeleteAsync(int id);
        Task<bool> ExistsAsync(int id);
        Task<bool> PermalinkExistsAsync(string permalink); // NEW

        // Get Products with Related Data (for detailed views)
        Task<Product?> GetProductWithAllDetailsAsync(int productId);
        Task<List<Product>> GetProductsWithCreatorAndFilesAsync();

        // Filtering and Searching
        Task<List<Product>> GetProductsByCategoryIdAsync(int categoryId, int? pageNumber = 1, int? pageSize = 10);
        Task<List<Product>> GetProductsByTagIdAsync(int tagId, int? pageNumber = 1, int? pageSize = 10);
        Task<List<Product>> SearchProductsAsync(string searchTerm, int? pageNumber = 1, int? pageSize = 10);
        Task<List<Product>> GetProductsByCreatorIdAsync(int creatorId, int? pageNumber = 1, int? pageSize = 10);
        Task<List<Product>> GetPublishedProductsAsync(int? pageNumber = 1, int? pageSize = 10);

        

        Task<IEnumerable<Product>> GetPublishedProductsAsync(int pageNumber, int pageSize);
        Task<IEnumerable<Product>> GetProductsByCreatorIdAsync(int creatorId, int pageNumber, int pageSize);
        Task<IEnumerable<Product>> SearchProductsAsync(string searchTerm, int pageNumber, int pageSize);
        Task<IEnumerable<Product>> GetProductsByCategoryIdAsync(int categoryId, int pageNumber, int pageSize);
        Task<IEnumerable<Product>> GetProductsByTagIdAsync(int tagId, int pageNumber, int pageSize);



        // Tag Management for Products
        Task AddProductTagAsync(int productId, int tagId);
        Task RemoveProductTagAsync(int productId, int tagId);
        Task<bool> ProductTagExistsAsync(int productId, int tagId);
        Task<List<Tag>> GetTagsForProductAsync(int productId);
        Task<List<Tag>> GetAvailableTagsForProductCategoriesAsync(int productId); // Tags associated with product's categories


        // Wishlist operations
        Task AddProductToWishlistAsync(int userId, int productId);
        Task RemoveProductFromWishlistAsync(int userId, int productId);
        Task<bool> IsProductInUserWishlistAsync(int userId, int productId);
        Task<IEnumerable<Product>> GetUserWishlistAsync(int userId, int pageNumber, int pageSize);

        Task<List<Product>> GetUserWishlistAsync(int userId, int? pageNumber = 1, int? pageSize = 10);


        // Derived Metrics Queries (for "Most Wished", "Top Rated", "Best Seller", "Trendy")        // Analytics

        Task RecordProductViewAsync(int productId, int? userId, string? ipAddress);     // Product View Tracking
        Task<IEnumerable<Product>> GetMostWishedProductsAsync(int count, int pageNumber, int pageSize); // Added pagination
        Task<IEnumerable<Product>> GetTopRatedProductsAsync(int count, int pageNumber, int pageSize); // Added pagination
        Task<IEnumerable<Product>> GetBestSellingProductsAsync(int count, int pageNumber, int pageSize); // Added pagination
        Task<IEnumerable<Product>> GetTrendyProductsAsync(int count, int daysBack, int pageNumber, int pageSize); // Added pagination


        Task<List<Product>> GetMostWishedProductsAsync(int count = 10);
        Task<List<Product>> GetTopRatedProductsAsync(int count = 10);
        Task<List<Product>> GetBestSellingProductsAsync(int count = 10);
        Task<List<Product>> GetTrendyProductsAsync(int count = 10, int daysBack = 30); // Combines views, sales, wishlist adds






        // Counts for pagination
        public Task<int> GetPublishedProductsCountAsync();
        Task<int> GetProductsByCreatorCountAsync(int creatorId);
        Task<int> GetUserWishlistCountAsync(int userId);











        //Product GetById(int id);
        //IEnumerable<Product> GetAllPublished();
        //IEnumerable<Product> GetAllByCreatorId(int creatorId);
        //IEnumerable<Product> GetAll(); // Admin
        ////IEnumerable<Product> GetAllFeatured();
        //IEnumerable<Product> GetBestSeller();
        //IEnumerable<Product> GetTrendy();
        //IEnumerable<Product> GetTopWishlisted();
        //IEnumerable<Product> GetMostViewed();





        // Derived Metrics Queries (for "Most Wished", "Top Rated", "Best Seller", "Trendy")
        //    Task<List<Product>> GetMostWishedProductsAsync(int count = 10);
        //    Task<List<Product>> GetTopRatedProductsAsync(int count = 10);
        //    Task<List<Product>> GetBestSellingProductsAsync(int count = 10);
        //    Task<List<Product>> GetTrendyProductsAsync(int count = 10, int daysBack = 30); // Combines views, sales, wishlist adds
        //    Task<double> GetPublishedProductsCountAsync();
        //    Task<double> GetProductsByCreatorCountAsync(int value);
        //    Task<IEnumerable<Product>> GetTrendyProductsAsync(int count, int daysBack, int pageNumber, int pageSize);
        //    Task<IEnumerable<Product>> GetBestSellingProductsAsync(int count, int pageNumber, int pageSize);
        //    Task<IEnumerable<Product>> GetTopRatedProductsAsync(int count, int pageNumber, int pageSize);
        //    Task<IEnumerable<Product>> GetMostWishedProductsAsync(int count, int pageNumber, int pageSize);
        //    Task<double> GetUserWishlistCountAsync(int userId);
        //    Task<bool> PermalinkExistsAsync(string permalink);
        //    Task<Product> GetProductWithAllDetailsByPermalinkAsync(string permalink);
    }
}
