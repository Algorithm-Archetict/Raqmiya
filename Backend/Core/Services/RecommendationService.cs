using Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Raqmiya.Infrastructure;
using Shared.DTOs.ProductDTOs;
using System.Text.Json;

namespace Core.Services
{
    /// <summary>
    /// Advanced recommendation service using hybrid approach:
    /// - Collaborative Filtering (user-based)
    /// - Content-Based Filtering (product features)
    /// - Popularity-Based (trending/popular items)
    /// - Context-Aware (time, user profile)
    /// </summary>
    public class RecommendationService : IRecommendationService
    {
        private readonly RaqmiyaDbContext _context;
        private readonly ILogger<RecommendationService> _logger;

        public RecommendationService(RaqmiyaDbContext context, ILogger<RecommendationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<ProductListItemDTO>> GetPersonalizedRecommendationsAsync(int userId, int count = 12)
        {
            try
            {
                _logger.LogInformation("Generating personalized recommendations for user {UserId}", userId);

                // Get user profile and preferences
                var userProfile = await GetOrCreateUserProfileAsync(userId);
                var userPreferences = await GetUserPreferencesAsync(userId);
                var userInteractions = await GetRecentUserInteractionsAsync(userId, 100); // Last 100 interactions

                if (!userInteractions.Any())
                {
                    _logger.LogInformation("No user interactions found for user {UserId}, returning generic recommendations", userId);
                    return await GetGenericRecommendationsAsync(count);
                }

                // Hybrid recommendation approach
                var recommendations = new List<RecommendationScore>();

                // 1. Collaborative Filtering (40% weight)
                var collaborativeRecommendations = await GetCollaborativeFilteringRecommendationsAsync(userId, count * 2);
                recommendations.AddRange(collaborativeRecommendations.Select(p => new RecommendationScore
                {
                    Product = p,
                    Score = 0.4m,
                    Reason = "Users with similar preferences also liked"
                }));

                // 2. Content-Based Filtering (35% weight)
                var contentBasedRecommendations = await GetContentBasedRecommendationsAsync(userId, count * 2);
                recommendations.AddRange(contentBasedRecommendations.Select(p => new RecommendationScore
                {
                    Product = p,
                    Score = 0.35m,
                    Reason = "Based on your interests"
                }));

                // 3. Trending/Popular items (20% weight)
                var trendingRecommendations = await GetTrendingProductsAsync(count);
                recommendations.AddRange(trendingRecommendations.Select(p => new RecommendationScore
                {
                    Product = p,
                    Score = 0.2m,
                    Reason = "Trending now"
                }));

                // 4. New arrivals from preferred categories (5% weight)
                var newArrivals = await GetNewArrivalsFromPreferredCategoriesAsync(userId, count);
                recommendations.AddRange(newArrivals.Select(p => new RecommendationScore
                {
                    Product = p,
                    Score = 0.05m,
                    Reason = "New in your favorite categories"
                }));

                // Combine and deduplicate recommendations
                var finalRecommendations = recommendations
                    .GroupBy(r => r.Product.Id)
                    .Select(g => new RecommendationScore
                    {
                        Product = g.First().Product,
                        Score = g.Sum(r => r.Score),
                        Reason = string.Join(", ", g.Select(r => r.Reason).Distinct())
                    })
                    .Where(r => !await HasUserPurchasedProductAsync(userId, r.Product.Id)) // Exclude purchased products
                    .OrderByDescending(r => r.Score)
                    .Take(count)
                    .ToList();

                _logger.LogInformation("Generated {Count} personalized recommendations for user {UserId}", finalRecommendations.Count, userId);

                return finalRecommendations.Select(r => r.Product);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating personalized recommendations for user {UserId}", userId);
                return await GetGenericRecommendationsAsync(count);
            }
        }

        public async Task<IEnumerable<ProductListItemDTO>> GetGenericRecommendationsAsync(int count = 12)
        {
            try
            {
                // For anonymous users or when personalization fails
                var products = await _context.Products
                    .Include(p => p.Creator)
                    .Include(p => p.Category)
                    .Include(p => p.Reviews)
                    .Include(p => p.WishlistItems)
                    .Include(p => p.OrderItems)
                    .Where(p => p.IsPublic)
                    .Where(p => p.Reviews.Any()) // Has reviews
                    .Select(p => new
                    {
                        Product = p,
                        PopularityScore = (p.Reviews.Average(r => r.Rating) * 0.3m) +
                                        (p.WishlistItems.Count * 0.4m) +
                                        (p.OrderItems.Count * 0.3m)
                    })
                    .OrderByDescending(x => x.PopularityScore)
                    .Take(count)
                    .ToListAsync();

                return products.Select(x => MapToProductListItemDTO(x.Product));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating generic recommendations");
                return new List<ProductListItemDTO>();
            }
        }

        public async Task RecordUserInteractionAsync(int userId, int productId, InteractionType interactionType, string? metadata = null)
        {
            try
            {
                var interaction = new UserInteraction
                {
                    UserId = userId,
                    ProductId = productId,
                    Type = interactionType,
                    Weight = GetInteractionWeight(interactionType),
                    Metadata = metadata,
                    CreatedAt = DateTime.UtcNow
                };

                _context.UserInteractions.Add(interaction);
                await _context.SaveChangesAsync();

                // Update user preferences asynchronously
                _ = Task.Run(() => UpdateUserPreferencesAsync(userId));

                _logger.LogDebug("Recorded interaction: User {UserId}, Product {ProductId}, Type {InteractionType}",
                    userId, productId, interactionType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording user interaction");
            }
        }

        public async Task UpdateUserPreferencesAsync(int userId)
        {
            try
            {
                // Calculate preferences based on user interactions
                var interactions = await _context.UserInteractions
                    .Include(ui => ui.Product)
                    .ThenInclude(p => p.Category)
                    .Include(ui => ui.Product)
                    .ThenInclude(p => p.ProductTags)
                    .ThenInclude(pt => pt.Tag)
                    .Where(ui => ui.UserId == userId)
                    .Where(ui => ui.CreatedAt >= DateTime.UtcNow.AddDays(-90)) // Last 90 days
                    .ToListAsync();

                if (!interactions.Any()) return;

                // Calculate category preferences
                var categoryScores = interactions
                    .Where(i => i.Product.Category != null)
                    .GroupBy(i => i.Product.CategoryId)
                    .Select(g => new
                    {
                        CategoryId = g.Key,
                        Score = g.Sum(i => i.Weight) / interactions.Sum(i => i.Weight)
                    })
                    .ToList();

                // Calculate tag preferences
                var tagScores = interactions
                    .SelectMany(i => i.Product.ProductTags.Select(pt => new { TagId = pt.TagId, Weight = i.Weight }))
                    .GroupBy(t => t.TagId)
                    .Select(g => new
                    {
                        TagId = g.Key,
                        Score = g.Sum(t => t.Weight) / interactions.Sum(i => i.Weight)
                    })
                    .ToList();

                // Update or create preferences
                foreach (var categoryScore in categoryScores)
                {
                    var preference = await _context.UserPreferences
                        .FirstOrDefaultAsync(up => up.UserId == userId && up.CategoryId == categoryScore.CategoryId);

                    if (preference == null)
                    {
                        preference = new UserPreference
                        {
                            UserId = userId,
                            CategoryId = categoryScore.CategoryId,
                            PreferenceScore = categoryScore.Score,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.UserPreferences.Add(preference);
                    }
                    else
                    {
                        preference.PreferenceScore = categoryScore.Score;
                        preference.UpdatedAt = DateTime.UtcNow;
                    }
                }

                foreach (var tagScore in tagScores)
                {
                    var preference = await _context.UserPreferences
                        .FirstOrDefaultAsync(up => up.UserId == userId && up.TagId == tagScore.TagId);

                    if (preference == null)
                    {
                        preference = new UserPreference
                        {
                            UserId = userId,
                            TagId = tagScore.TagId,
                            PreferenceScore = tagScore.Score,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.UserPreferences.Add(preference);
                    }
                    else
                    {
                        preference.PreferenceScore = tagScore.Score;
                        preference.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogDebug("Updated preferences for user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user preferences for user {UserId}", userId);
            }
        }

        public async Task<decimal> CalculateUserSimilarityAsync(int userId1, int userId2)
        {
            try
            {
                var user1Preferences = await GetUserPreferencesAsync(userId1);
                var user2Preferences = await GetUserPreferencesAsync(userId2);

                if (!user1Preferences.Any() || !user2Preferences.Any())
                    return 0;

                // Calculate cosine similarity
                var commonCategories = user1Preferences
                    .Where(p1 => p1.CategoryId.HasValue && user2Preferences.Any(p2 => p2.CategoryId == p1.CategoryId))
                    .ToList();

                var commonTags = user1Preferences
                    .Where(p1 => p1.TagId.HasValue && user2Preferences.Any(p2 => p2.TagId == p1.TagId))
                    .ToList();

                if (!commonCategories.Any() && !commonTags.Any())
                    return 0;

                decimal dotProduct = 0;
                decimal norm1 = 0;
                decimal norm2 = 0;

                foreach (var pref1 in commonCategories)
                {
                    var pref2 = user2Preferences.First(p => p.CategoryId == pref1.CategoryId);
                    dotProduct += pref1.PreferenceScore * pref2.PreferenceScore;
                }

                foreach (var pref1 in commonTags)
                {
                    var pref2 = user2Preferences.First(p => p.TagId == pref1.TagId);
                    dotProduct += pref1.PreferenceScore * pref2.PreferenceScore;
                }

                norm1 = (decimal)Math.Sqrt((double)user1Preferences.Sum(p => p.PreferenceScore * p.PreferenceScore));
                norm2 = (decimal)Math.Sqrt((double)user2Preferences.Sum(p => p.PreferenceScore * p.PreferenceScore));

                if (norm1 == 0 || norm2 == 0)
                    return 0;

                return dotProduct / (norm1 * norm2);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating user similarity between {UserId1} and {UserId2}", userId1, userId2);
                return 0;
            }
        }

        public async Task<IEnumerable<ProductListItemDTO>> GetSimilarProductsAsync(int productId, int count = 6)
        {
            try
            {
                var targetProduct = await _context.Products
                    .Include(p => p.Category)
                    .Include(p => p.ProductTags)
                    .ThenInclude(pt => pt.Tag)
                    .FirstOrDefaultAsync(p => p.Id == productId);

                if (targetProduct == null)
                    return new List<ProductListItemDTO>();

                var similarProducts = await _context.Products
                    .Include(p => p.Creator)
                    .Include(p => p.Category)
                    .Include(p => p.Reviews)
                    .Include(p => p.ProductTags)
                    .ThenInclude(pt => pt.Tag)
                    .Where(p => p.Id != productId && p.IsPublic)
                    .Where(p => p.CategoryId == targetProduct.CategoryId || 
                               p.ProductTags.Any(pt => targetProduct.ProductTags.Any(tpt => tpt.TagId == pt.TagId)))
                    .OrderByDescending(p => p.Reviews.Any() ? p.Reviews.Average(r => r.Rating) : 0)
                    .Take(count)
                    .ToListAsync();

                return similarProducts.Select(MapToProductListItemDTO);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting similar products for product {ProductId}", productId);
                return new List<ProductListItemDTO>();
            }
        }

        public async Task<IEnumerable<ProductListItemDTO>> GetTrendingProductsAsync(int count = 12, int daysBack = 7)
        {
            try
            {
                var cutoffDate = DateTime.UtcNow.AddDays(-daysBack);

                var trendingProducts = await _context.Products
                    .Include(p => p.Creator)
                    .Include(p => p.Category)
                    .Include(p => p.Reviews)
                    .Include(p => p.UserInteractions)
                    .Where(p => p.IsPublic)
                    .Select(p => new
                    {
                        Product = p,
                        TrendingScore = p.UserInteractions
                            .Where(ui => ui.CreatedAt >= cutoffDate)
                            .Sum(ui => ui.Weight)
                    })
                    .OrderByDescending(x => x.TrendingScore)
                    .Take(count)
                    .ToListAsync();

                return trendingProducts.Select(x => MapToProductListItemDTO(x.Product));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting trending products");
                return new List<ProductListItemDTO>();
            }
        }

        #region Private Helper Methods

        private async Task<UserProfile> GetOrCreateUserProfileAsync(int userId)
        {
            var profile = await _context.UserProfiles.FirstOrDefaultAsync(up => up.UserId == userId);
            if (profile == null)
            {
                profile = new UserProfile
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UserProfiles.Add(profile);
                await _context.SaveChangesAsync();
            }
            return profile;
        }

        private async Task<List<UserPreference>> GetUserPreferencesAsync(int userId)
        {
            return await _context.UserPreferences
                .Where(up => up.UserId == userId)
                .OrderByDescending(up => up.PreferenceScore)
                .ToListAsync();
        }

        private async Task<List<UserInteraction>> GetRecentUserInteractionsAsync(int userId, int count)
        {
            return await _context.UserInteractions
                .Include(ui => ui.Product)
                .Where(ui => ui.UserId == userId)
                .OrderByDescending(ui => ui.CreatedAt)
                .Take(count)
                .ToListAsync();
        }

        private async Task<IEnumerable<ProductListItemDTO>> GetCollaborativeFilteringRecommendationsAsync(int userId, int count)
        {
            // Find similar users
            var allUserIds = await _context.UserInteractions
                .Where(ui => ui.UserId != userId)
                .Select(ui => ui.UserId)
                .Distinct()
                .Take(100) // Limit for performance
                .ToListAsync();

            var similarUsers = new List<(int UserId, decimal Similarity)>();

            foreach (var otherUserId in allUserIds)
            {
                var similarity = await CalculateUserSimilarityAsync(userId, otherUserId);
                if (similarity > 0.1m) // Minimum similarity threshold
                {
                    similarUsers.Add((otherUserId, similarity));
                }
            }

            if (!similarUsers.Any())
                return new List<ProductListItemDTO>();

            // Get products liked by similar users
            var topSimilarUsers = similarUsers
                .OrderByDescending(u => u.Similarity)
                .Take(10)
                .Select(u => u.UserId)
                .ToList();

            var recommendedProducts = await _context.UserInteractions
                .Include(ui => ui.Product)
                .ThenInclude(p => p.Creator)
                .Include(ui => ui.Product)
                .ThenInclude(p => p.Category)
                .Include(ui => ui.Product)
                .ThenInclude(p => p.Reviews)
                .Where(ui => topSimilarUsers.Contains(ui.UserId))
                .Where(ui => ui.Type == InteractionType.Purchase || ui.Type == InteractionType.Wishlist || ui.Type == InteractionType.Review)
                .Where(ui => ui.Product.IsPublic)
                .GroupBy(ui => ui.Product)
                .OrderByDescending(g => g.Sum(ui => ui.Weight))
                .Take(count)
                .Select(g => g.Key)
                .ToListAsync();

            return recommendedProducts.Select(MapToProductListItemDTO);
        }

        private async Task<IEnumerable<ProductListItemDTO>> GetContentBasedRecommendationsAsync(int userId, int count)
        {
            var userPreferences = await GetUserPreferencesAsync(userId);
            if (!userPreferences.Any())
                return new List<ProductListItemDTO>();

            var preferredCategoryIds = userPreferences
                .Where(up => up.CategoryId.HasValue)
                .OrderByDescending(up => up.PreferenceScore)
                .Take(5)
                .Select(up => up.CategoryId!.Value)
                .ToList();

            var preferredTagIds = userPreferences
                .Where(up => up.TagId.HasValue)
                .OrderByDescending(up => up.PreferenceScore)
                .Take(10)
                .Select(up => up.TagId!.Value)
                .ToList();

            var products = await _context.Products
                .Include(p => p.Creator)
                .Include(p => p.Category)
                .Include(p => p.Reviews)
                .Include(p => p.ProductTags)
                .Where(p => p.IsPublic)
                .Where(p => preferredCategoryIds.Contains(p.CategoryId) || 
                           p.ProductTags.Any(pt => preferredTagIds.Contains(pt.TagId)))
                .OrderByDescending(p => p.Reviews.Any() ? p.Reviews.Average(r => r.Rating) : 0)
                .Take(count)
                .ToListAsync();

            return products.Select(MapToProductListItemDTO);
        }

        private async Task<IEnumerable<ProductListItemDTO>> GetNewArrivalsFromPreferredCategoriesAsync(int userId, int count)
        {
            var userPreferences = await GetUserPreferencesAsync(userId);
            var preferredCategoryIds = userPreferences
                .Where(up => up.CategoryId.HasValue)
                .Select(up => up.CategoryId!.Value)
                .ToList();

            if (!preferredCategoryIds.Any())
                return new List<ProductListItemDTO>();

            var products = await _context.Products
                .Include(p => p.Creator)
                .Include(p => p.Category)
                .Include(p => p.Reviews)
                .Where(p => p.IsPublic)
                .Where(p => preferredCategoryIds.Contains(p.CategoryId))
                .OrderByDescending(p => p.PublishedAt)
                .Take(count)
                .ToListAsync();

            return products.Select(MapToProductListItemDTO);
        }

        private async Task<bool> HasUserPurchasedProductAsync(int userId, int productId)
        {
            return await _context.OrderItems
                .Include(oi => oi.Order)
                .AnyAsync(oi => oi.Order.BuyerId == userId && oi.ProductId == productId);
        }

        private static decimal GetInteractionWeight(InteractionType interactionType)
        {
            return interactionType switch
            {
                InteractionType.View => 1.0m,
                InteractionType.Wishlist => 2.0m,
                InteractionType.Purchase => 5.0m,
                InteractionType.Review => 3.0m,
                InteractionType.Download => 4.0m,
                InteractionType.Share => 1.5m,
                InteractionType.Search => 0.5m,
                _ => 1.0m
            };
        }

        private static ProductListItemDTO MapToProductListItemDTO(Product product)
        {
            return new ProductListItemDTO
            {
                Id = product.Id,
                Name = product.Name,
                Price = product.Price,
                CoverImageUrl = product.CoverImageUrl,
                AverageRating = product.Reviews.Any() ? product.Reviews.Average(r => r.Rating) : 0,
                CreatorUsername = product.Creator?.Username ?? "Unknown",
                IsPublic = product.IsPublic,
                Category = new CategoryDTO
                {
                    Id = product.Category?.Id ?? 0,
                    Name = product.Category?.Name ?? "Unknown",
                    ParentCategoryId = product.Category?.ParentCategoryId
                },
                SalesCount = product.OrderItems?.Count ?? 0,
                Currency = "USD",
                Permalink = product.Permalink,
                Status = product.IsPublic ? "Published" : "Draft",
                PublishedAt = product.PublishedAt?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") ?? ""
            };
        }

        #endregion

        private class RecommendationScore
        {
            public ProductListItemDTO Product { get; set; } = null!;
            public decimal Score { get; set; }
            public string Reason { get; set; } = string.Empty;
        }
    }
}
