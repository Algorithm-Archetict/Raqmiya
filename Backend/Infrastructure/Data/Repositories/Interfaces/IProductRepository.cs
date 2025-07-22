using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface IProductRepository
    {
        //Product GetById(int id);
        //IEnumerable<Product> GetAllPublished();
        //IEnumerable<Product> GetAllByCreatorId(int creatorId);
        //IEnumerable<Product> GetAll(); // Admin
        ////IEnumerable<Product> GetAllFeatured();
        //IEnumerable<Product> GetBestSeller();
        //IEnumerable<Product> GetTrendy();
        //IEnumerable<Product> GetTopWishlisted();
        //IEnumerable<Product> GetMostViewed();


        //void Add(Product product);
        //void Update(Product product);
        //void Delete(int id);
        //void SaveChanges();



        // Basic CRUD Operations
        Task<Product?> GetByIdAsync(int id);
        Task<List<Product>> GetAllAsync();
        Task AddAsync(Product product);
        Task UpdateAsync(Product product);
        Task DeleteAsync(int id);
        Task<bool> ExistsAsync(int id);

        // Get Products with Related Data (for detailed views)
        Task<Product?> GetProductWithAllDetailsAsync(int productId);
        Task<List<Product>> GetProductsWithCreatorAndFilesAsync();

        // Filtering and Searching
        Task<List<Product>> GetProductsByCategoryIdAsync(int categoryId, int? pageNumber = 1, int? pageSize = 10);
        Task<List<Product>> GetProductsByTagIdAsync(int tagId, int? pageNumber = 1, int? pageSize = 10);
        Task<List<Product>> SearchProductsAsync(string searchTerm, int? pageNumber = 1, int? pageSize = 10);
        Task<List<Product>> GetProductsByCreatorIdAsync(int creatorId, int? pageNumber = 1, int? pageSize = 10);
        Task<List<Product>> GetPublishedProductsAsync(int? pageNumber = 1, int? pageSize = 10);

        // Tag Management for Products
        Task AddProductTagAsync(int productId, int tagId);
        Task RemoveProductTagAsync(int productId, int tagId);
        Task<bool> ProductTagExistsAsync(int productId, int tagId);
        Task<List<Tag>> GetTagsForProductAsync(int productId);
        Task<List<Tag>> GetAvailableTagsForProductCategoriesAsync(int productId); // Tags associated with product's categories

        // Wishlist Operations
        Task AddProductToWishlistAsync(int userId, int productId);
        Task RemoveProductFromWishlistAsync(int userId, int productId);
        Task<bool> IsProductInUserWishlistAsync(int userId, int productId);
        Task<List<Product>> GetUserWishlistAsync(int userId, int? pageNumber = 1, int? pageSize = 10);

        // Product View Tracking
        Task RecordProductViewAsync(int productId, int? userId, string? ipAddress);

        // Derived Metrics Queries (for "Most Wished", "Top Rated", "Best Seller", "Trendy")
        Task<List<Product>> GetMostWishedProductsAsync(int count = 10);
        Task<List<Product>> GetTopRatedProductsAsync(int count = 10);
        Task<List<Product>> GetBestSellingProductsAsync(int count = 10);
        Task<List<Product>> GetTrendyProductsAsync(int count = 10, int daysBack = 30); // Combines views, sales, wishlist adds
        Task<double> GetPublishedProductsCountAsync();
        Task<double> GetProductsByCreatorCountAsync(int value);
    }
}
