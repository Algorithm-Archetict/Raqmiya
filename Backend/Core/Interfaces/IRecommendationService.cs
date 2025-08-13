using Shared.DTOs.ProductDTOs;

namespace Core.Interfaces
{
    /// <summary>
    /// Service for generating personalized product recommendations
    /// </summary>
    public interface IRecommendationService
    {
        /// <summary>
        /// Get personalized product recommendations for a user
        /// </summary>
        Task<IEnumerable<ProductListItemDTO>> GetPersonalizedRecommendationsAsync(int userId, int count = 12);

        /// <summary>
        /// Get generic recommendations for anonymous users
        /// </summary>
        Task<IEnumerable<ProductListItemDTO>> GetGenericRecommendationsAsync(int count = 12);

        /// <summary>
        /// Track user interaction for recommendation learning
        /// </summary>
        Task RecordUserInteractionAsync(int userId, int productId, InteractionType interactionType, string? metadata = null);

        /// <summary>
        /// Update user preferences based on interactions
        /// </summary>
        Task UpdateUserPreferencesAsync(int userId);

        /// <summary>
        /// Calculate similarity between users for collaborative filtering
        /// </summary>
        Task<decimal> CalculateUserSimilarityAsync(int userId1, int userId2);

        /// <summary>
        /// Get products similar to a given product (content-based filtering)
        /// </summary>
        Task<IEnumerable<ProductListItemDTO>> GetSimilarProductsAsync(int productId, int count = 6);

        /// <summary>
        /// Get trending products based on recent user interactions
        /// </summary>
        Task<IEnumerable<ProductListItemDTO>> GetTrendingProductsAsync(int count = 12, int daysBack = 7);
    }
}
