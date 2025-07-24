using Shared.DTOs.ProductDTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Interfaces
{
    public interface IProductService
    {
        // Publicly accessible product listings
        Task<PagedResultDTO<ProductListItemDTO>> GetPublishedProductsAsync(int pageNumber, int pageSize);
        Task<PagedResultDTO<ProductListItemDTO>> GetProductsByCategoryAsync(int categoryId, int pageNumber, int pageSize);
        Task<PagedResultDTO<ProductListItemDTO>> GetProductsByTagAsync(int tagId, int pageNumber, int pageSize);
        Task<PagedResultDTO<ProductListItemDTO>> SearchProductsAsync(string search, int pageNumber, int pageSize);
        Task<ProductDetailDTO?> GetProductDetailsByPermalinkAsync(string permalink, int? userId = null); // For public view by permalink
        Task<ProductDetailDTO?> GetProductDetailsByIdAsync(int productId, int? userId = null); // For internal/creator view by ID

        // Creator-specific product management
        Task<PagedResultDTO<ProductListItemDTO>> GetCreatorProductsAsync(int creatorId, int pageNumber, int pageSize);
        Task<ProductDetailDTO> CreateProductAsync(int creatorId, ProductCreateRequestDTO productDto);
        Task<ProductDetailDTO> UpdateProductAsync(int productId, int creatorId, ProductUpdateRequestDTO productDto);
        Task DeleteProductAsync(int productId, int creatorId);

        // Wishlist operations
        Task AddProductToWishlistAsync(int userId, int productId);
        Task RemoveProductFromWishlistAsync(int userId, int productId);
        Task<PagedResultDTO<ProductListItemDTO>> GetUserWishlistAsync(int userId, int pageNumber, int pageSize);

        // Analytics / Derived Metrics
        Task RecordProductViewAsync(int productId, int? userId, string? ipAddress);
        Task<PagedResultDTO<ProductListItemDTO>> GetMostWishedProductsAsync(int count, int pageNumber, int pageSize); // Added pagination
        Task<PagedResultDTO<ProductListItemDTO>> GetTopRatedProductsAsync(int count, int pageNumber, int pageSize); // Added pagination
        Task<PagedResultDTO<ProductListItemDTO>> GetBestSellingProductsAsync(int count, int pageNumber, int pageSize); // Added pagination
        Task<PagedResultDTO<ProductListItemDTO>> GetTrendyProductsAsync(int count, int daysBack, int pageNumber, int pageSize); // Added pagination

        // Category & Tag helpers for forms (API endpoints will call these)
        Task<List<CategoryDTO>> GetAllCategoriesAsync();
        Task<List<TagDTO>> GetAllTagsAsync();
        Task<List<TagDTO>> GetTagsForCategoriesAsync(List<int> categoryIds);
    }
}
