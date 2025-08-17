using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;

namespace Raqmiya.Infrastructure
{
    public class ProductRepository : IProductRepository
    {
        private readonly RaqmiyaDbContext _context;

        public ProductRepository(RaqmiyaDbContext context)
        {
            _context = context;
        }

        // --- Basic CRUD Operations ---
        public async Task<Product?> GetByIdAsync(int id)
            => await _context.Products.FindAsync(id);

        public async Task<Product?> GetByIdIncludingDeletedAsync(int id)
            => await _context.Products.FindAsync(id);

        public async Task<List<Product>> GetAllAsync()
            => await _context.Products.ToListAsync();

        public async Task<IEnumerable<Product>> GetAllAsync(int pageNumber, int pageSize)
            => await _context.Products
                .OrderBy(p => p.Id)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .AsNoTracking()
                .ToListAsync();

        public async Task AddAsync(Product product)
        {
            await _context.Products.AddAsync(product);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Product product)
        {
            // Log the incoming product data
            Console.WriteLine($"UpdateAsync - Product ID: {product.Id}");
            Console.WriteLine($"UpdateAsync - CoverImageUrl: {product.CoverImageUrl}");
            Console.WriteLine($"UpdateAsync - ThumbnailImageUrl: {product.ThumbnailImageUrl}");
            
            // Ensure the entity is tracked by Entity Framework
            var existingProduct = await _context.Products.FindAsync(product.Id);
            if (existingProduct != null)
            {
                Console.WriteLine($"UpdateAsync - Found existing product, updating properties");
                // Update the existing entity's properties
                _context.Entry(existingProduct).CurrentValues.SetValues(product);
            }
            else
            {
                Console.WriteLine($"UpdateAsync - Product not found, attaching entity");
                // If not found, attach the entity
                _context.Products.Update(product);
            }
            
            var result = await _context.SaveChangesAsync();
            Console.WriteLine($"UpdateAsync - SaveChanges result: {result} rows affected");
            
            // Verify the update by re-fetching
            var updatedProduct = await _context.Products.FindAsync(product.Id);
            Console.WriteLine($"UpdateAsync - After save - CoverImageUrl: {updatedProduct?.CoverImageUrl}");
            Console.WriteLine($"UpdateAsync - After save - ThumbnailImageUrl: {updatedProduct?.ThumbnailImageUrl}");
        }

        public async Task DeleteAsync(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product != null)
            {
                _context.Products.Remove(product);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> ExistsAsync(int id)
            => await _context.Products.AnyAsync(p => p.Id == id);

        public async Task<bool> PermalinkExistsAsync(string permalink)
            => await _context.Products.AnyAsync(p => p.Permalink == permalink);

        // --- Get Products with Related Data ---
        public async Task<Product?> GetProductWithAllDetailsAsync(int productId)
            => await _context.Products
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Files)
                .Include(p => p.Variants)
                .Include(p => p.OfferCodes)
                .Include(p => p.Reviews).ThenInclude(r => r.User)

                .Include(p => p.Category)
                .Include(p => p.ProductTags).ThenInclude(pt => pt.Tag)
                .Include(p => p.WishlistItems)
                .Include(p => p.ProductViews)
                .FirstOrDefaultAsync(p => p.Id == productId);

        public async Task<Product?> GetProductWithAllDetailsByPermalinkAsync(string permalink)
            => await _context.Products
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Files)
                .Include(p => p.Variants)
                .Include(p => p.OfferCodes)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .Include(p => p.Category)
                .Include(p => p.ProductTags).ThenInclude(pt => pt.Tag)
                .Include(p => p.WishlistItems)
                .Include(p => p.OrderItems)
                .Include(p => p.ProductViews)
                .FirstOrDefaultAsync(p => p.Permalink == permalink);

        public async Task<List<Product>> GetProductsWithCreatorAndFilesAsync()
            => await _context.Products
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Files)
                .ToListAsync();

        // --- Filtering and Searching ---
        private IQueryable<Product> ApplyPagination(IQueryable<Product> query, int? pageNumber, int? pageSize)
        {
            if (pageNumber.HasValue && pageSize.HasValue)
                return query.Skip((pageNumber.Value - 1) * pageSize.Value).Take(pageSize.Value);
            return query;
        }

        public async Task<List<Product>> GetProductsByCategoryIdAsync(int categoryId, int? pageNumber = 1, int? pageSize = 10)
        {
            var query = _context.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Creator)
                .Include(p => p.Reviews).ThenInclude(r => r.User);
                //.Where(p => p.ProductCategories.Any(pc => pc.CategoryId == categoryId) && p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive);
            return await ApplyPagination(query, pageNumber, pageSize).ToListAsync();
        }
        public async Task<IEnumerable<Product>> GetProductsByCategoryIdAsync(int categoryId, int pageNumber, int pageSize)
        {
            return await _context.Products
                .Where(p => p.CategoryId == categoryId)
                .OrderByDescending(p => p.PublishedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetProductsByMultipleCategoryIdsAsync(List<int> categoryIds, int pageNumber, int pageSize)
        {
            return await _context.Products
                .Where(p => categoryIds.Contains(p.CategoryId) && p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.PublishedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Category)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .ToListAsync();
        }

        public async Task<int> GetProductsCountByMultipleCategoryIdsAsync(List<int> categoryIds)
        {
            return await _context.Products
                .Where(p => categoryIds.Contains(p.CategoryId) && p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .CountAsync();
        }

        public async Task<int> GetProductsCountByTagIdAsync(int tagId)
        {
            return await _context.Products
                .Where(p => p.ProductTags.Any(pt => pt.TagId == tagId))
                .CountAsync();
        }

        public async Task<int> GetProductsCountBySearchAsync(string searchTerm)
        {
            return await _context.Products
                .Where(p => p.Name.Contains(searchTerm) || p.Description.Contains(searchTerm))
                .CountAsync();
        }
        public async Task<List<Product>> GetProductsByTagIdAsync(int tagId, int? pageNumber = 1, int? pageSize = 10)
        {
            var query = _context.Products
                .AsNoTracking()
                .Include(p => p.ProductTags).ThenInclude(pt => pt.Tag)
                .Include(p => p.Creator)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .Where(p => p.ProductTags.Any(pt => pt.TagId == tagId) && p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive);
            return await ApplyPagination(query, pageNumber, pageSize).ToListAsync();
        }
        public async Task<IEnumerable<Product>> GetProductsByTagIdAsync(int tagId, int pageNumber, int pageSize)
        {
            return await _context.Products
                .Where(p => p.ProductTags.Any(pt => pt.TagId == tagId) && p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.PublishedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .ToListAsync();
        }
        public async Task<List<Product>> SearchProductsAsync(string searchTerm, int? pageNumber = 1, int? pageSize = 10)
        {
            var query = _context.Products
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .Where(p => (p.Name.Contains(searchTerm) || p.Description.Contains(searchTerm)) && p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive);
            return await ApplyPagination(query, pageNumber, pageSize).ToListAsync();
        }
        public async Task<IEnumerable<Product>> SearchProductsAsync(string searchTerm, int pageNumber, int pageSize)
        {
            return await _context.Products
                .Where(p => (p.Name.Contains(searchTerm) || p.Description.Contains(searchTerm)) && p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.PublishedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .ToListAsync();
        }
        public async Task<List<Product>> GetProductsByCreatorIdAsync(int creatorId, int? pageNumber = 1, int? pageSize = 10)
        {
            var query = _context.Products
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .Where(p => p.CreatorId == creatorId && !p.IsDeleted && p.Creator.IsActive);
            return await ApplyPagination(query, pageNumber, pageSize).ToListAsync();
        }
        public async Task<IEnumerable<Product>> GetProductsByCreatorIdAsync(int creatorId, int pageNumber, int pageSize)
        {
            return await _context.Products
                .Where(p => p.CreatorId == creatorId && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.PublishedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .ToListAsync();
        }
        public async Task<List<Product>> GetPublishedProductsAsync(int? pageNumber = 1, int? pageSize = 10)
        {
            var query = _context.Products
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Files)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .Where(p => p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive);
            return await ApplyPagination(query, pageNumber, pageSize).ToListAsync();
        }
        public async Task<IEnumerable<Product>> GetPublishedProductsAsync(int pageNumber, int pageSize)
        {
            // Fix: Remove .Include() after .Select() - not allowed in EF Core
            return await _context.Products
                .Where(p => p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.PublishedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Reviews).ThenInclude(r => r.User)
                .ToListAsync();
        }


        // --- Tag Management for Products ---
        public async Task AddProductTagAsync(int productId, int tagId)
        {
            if (!await ProductTagExistsAsync(productId, tagId))
            {
                var productTag = new ProductTag { ProductId = productId, TagId = tagId };
                await _context.ProductTags.AddAsync(productTag);
                await _context.SaveChangesAsync();
            }
        }

        public async Task RemoveProductTagAsync(int productId, int tagId)
        {
            var productTag = await _context.ProductTags
                .FirstOrDefaultAsync(pt => pt.ProductId == productId && pt.TagId == tagId);
            if (productTag != null)
            {
                _context.ProductTags.Remove(productTag);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> ProductTagExistsAsync(int productId, int tagId)
        {
            return await _context.ProductTags.AnyAsync(pt => pt.ProductId == productId && pt.TagId == tagId);
        }

        public async Task<List<Tag>> GetTagsForProductAsync(int productId)
        {
            return await _context.ProductTags
                .AsNoTracking()
                .Where(pt => pt.ProductId == productId)
                .Select(pt => pt.Tag)
                .ToListAsync();
        }

        public async Task<List<Tag>> GetAvailableTagsForProductCategoriesAsync(int productId)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
            {
                return new List<Tag>();
            }

            return await _context.CategoryTags
                .AsNoTracking()
                .Where(ct => ct.CategoryId == product.CategoryId)
                .Select(ct => ct.Tag)
                .Distinct()
                .ToListAsync();
        }

        // --- Wishlist Operations ---
        public async Task AddProductToWishlistAsync(int userId, int productId)
        {
            if (!await IsProductInUserWishlistAsync(userId, productId))
            {
                var wishlistItem = new WishlistItem
                {
                    UserId = userId,
                    ProductId = productId,
                    AddedAt = DateTime.Now // Use DateTime.UtcNow for production
                };
                await _context.WishlistItems.AddAsync(wishlistItem);
                await _context.SaveChangesAsync();
            }
        }

        public async Task RemoveProductFromWishlistAsync(int userId, int productId)
        {
            var wishlistItem = await _context.WishlistItems
                .FirstOrDefaultAsync(wi => wi.UserId == userId && wi.ProductId == productId);
            if (wishlistItem != null)
            {
                _context.WishlistItems.Remove(wishlistItem);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> IsProductInUserWishlistAsync(int userId, int productId)
        {
            return await _context.WishlistItems.AnyAsync(wi => wi.UserId == userId && wi.ProductId == productId);
        }

        // --- Optimized Wishlist Query ---
        public async Task<IEnumerable<Product>> GetUserWishlistAsync(int userId, int pageNumber, int pageSize)
        {
            return await _context.WishlistItems
                .Where(wi => wi.UserId == userId)
                .Include(wi => wi.Product)
                    .ThenInclude(p => p.Creator) // Include creator information
                .Include(wi => wi.Product)
                    .ThenInclude(p => p.Reviews) // Include reviews for rating calculation
                .OrderByDescending(wi => wi.Product.PublishedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(wi => wi.Product)
                .AsNoTracking()
                .ToListAsync();
        }

        // --- Product View Tracking ---
        public async Task RecordProductViewAsync(int productId, int? userId, string? ipAddress)
        {
            var productView = new ProductView
            {
                ProductId = productId,
                UserId = userId,
                ViewedAt = DateTime.UtcNow,
                IpAddress = ipAddress
            };
            await _context.ProductViews.AddAsync(productView);
            await _context.SaveChangesAsync();
        }

        // --- Derived Metrics Queries ---

        public async Task<List<Product>> GetMostWishedProductsAsync(int count = 10)
        {
            return await _context.Products
                .AsNoTracking()
                .Include(p => p.Creator) // Include relevant details
                .Where(p => p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.WishlistItems.Count())
                .Take(count)
                .ToListAsync();
        }

        public async Task<List<Product>> GetTopRatedProductsAsync(int count = 10)
        {
            return await _context.Products
                .AsNoTracking()
                .Include(p => p.Creator)
                .Where(p => p.Reviews.Any() && p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive) // Only products with reviews
                .OrderByDescending(p => p.Reviews.Average(r => r.Rating))
                .Take(count)
                .ToListAsync();
        }

        public async Task<List<Product>> GetBestSellingProductsAsync(int count = 10)
        {
            return await _context.Products
                .AsNoTracking()
                .Include(p => p.Creator)
                .Where(p => p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.OrderItems.Count()) // Assuming one order item per product
                .Take(count)
                .ToListAsync();
        }

        public async Task<List<Product>> GetTrendyProductsAsync(int count = 10, int daysBack = 30)
        {
            var cutoffDate = DateTime.Now.AddDays(-daysBack); // Use DateTime.UtcNow for production

            // This is a simplified "trendy" calculation.
            // A more sophisticated algorithm would involve weighting different factors,
            // normalization, and potentially a background service to pre-calculate scores.
            return await _context.Products
                .AsNoTracking()
                .Include(p => p.Creator)
                .Where(p => p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .Select(p => new
                {
                    Product = p,
                    RecentSales = p.OrderItems.Count(oi => oi.Order.OrderedAt >= cutoffDate),
                    RecentWishlistAdds = p.WishlistItems.Count(wi => wi.AddedAt >= cutoffDate),
                    RecentViews = p.ProductViews.Count(pv => pv.ViewedAt >= cutoffDate),
                    AverageRating = p.Reviews.Any() ? p.Reviews.Average(r => r.Rating) : 0 // Include rating as a factor
                })
                // Order by a combination of factors. Adjust weights as needed.
                .OrderByDescending(x => x.RecentSales * 3 // Sales carry more weight
                                     + x.RecentWishlistAdds * 2
                                     + x.RecentViews
                                     + x.AverageRating * 10 // High ratings might signify trend
                                     )
                .Select(x => x.Product)
                .Take(count)
                .ToListAsync();
        }

        // --- Derived Metrics Queries ---
        public async Task<int> GetPublishedProductsCountAsync()
        {
            return await _context.Products.CountAsync(p => p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive);
        }

        public async Task<int> GetProductsByCreatorCountAsync(int creatorId)
        {
            return await _context.Products.CountAsync(p => p.CreatorId == creatorId && !p.IsDeleted && p.Creator.IsActive);
        }

        public async Task<int> GetUserWishlistCountAsync(int userId)
        {
            return await _context.WishlistItems.CountAsync(wi => wi.UserId == userId);
        }

        public async Task<IEnumerable<Product>> GetMostWishedProductsAsync(int count, int pageNumber, int pageSize)
        {
            // Only include what is needed for analytics display
            return await _context.Products
                .Where(p => p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.WishlistItems.Count())
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new Product {
                    Id = p.Id,
                    Name = p.Name,
                    Creator = p.Creator,
                    Reviews = p.Reviews,
                    OrderItems = p.OrderItems,
                    PublishedAt = p.PublishedAt,
                    IsPublic = p.IsPublic,
                    Status = p.Status
                })
                .AsNoTracking()
                .Include(p => p.Creator)
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetTopRatedProductsAsync(int count, int pageNumber, int pageSize)
        {
            return await _context.Products
                .Where(p => p.Status == "published" && p.IsPublic && p.Reviews.Any() && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.Reviews.Average(r => r.Rating))
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new Product {
                    Id = p.Id,
                    Name = p.Name,
                    Creator = p.Creator,
                    Reviews = p.Reviews,
                    OrderItems = p.OrderItems,
                    PublishedAt = p.PublishedAt,
                    IsPublic = p.IsPublic,
                    Status = p.Status
                })
                .AsNoTracking()
                .Include(p => p.Creator)
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetBestSellingProductsAsync(int count, int pageNumber, int pageSize)
        {
            return await _context.Products
                .Where(p => p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.OrderItems.Count())
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new Product {
                    Id = p.Id,
                    Name = p.Name,
                    Creator = p.Creator,
                    Reviews = p.Reviews,
                    OrderItems = p.OrderItems,
                    PublishedAt = p.PublishedAt,
                    IsPublic = p.IsPublic,
                    Status = p.Status
                })
                .AsNoTracking()
                .Include(p => p.Creator)
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetTrendyProductsAsync(int count, int daysBack, int pageNumber, int pageSize)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-daysBack);
            return await _context.Products
                .Where(p => p.Status == "published" && p.IsPublic && !p.IsDeleted && p.Creator.IsActive)
                .OrderByDescending(p => p.ProductViews.Count(pv => pv.ViewedAt >= cutoffDate) +
                                         p.WishlistItems.Count(wi => wi.AddedAt >= cutoffDate) +
                                         p.OrderItems.Count(o => o.CreatedAt >= cutoffDate))
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new Product {
                    Id = p.Id,
                    Name = p.Name,
                    Creator = p.Creator,
                    Reviews = p.Reviews,
                    OrderItems = p.OrderItems,
                    PublishedAt = p.PublishedAt,
                    IsPublic = p.IsPublic,
                    Status = p.Status
                })
                .AsNoTracking()
                .Include(p => p.Creator)
                .ToListAsync();
        }

        // --- Optimize GetProductsByStatusAsync for admin moderation ---
        public async Task<List<Product>> GetProductsByStatusAsync(string status, int pageNumber, int pageSize)
        {
            return await _context.Products
                .Where(p => p.Status == status)
                .OrderByDescending(p => p.PublishedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new Product {
                    Id = p.Id,
                    Name = p.Name,
                    Creator = p.Creator,
                    PublishedAt = p.PublishedAt,
                    Status = p.Status
                })
                .AsNoTracking()
                .Include(p => p.Creator)
                .ToListAsync();
        }

        public async Task<bool> ApproveProductAsync(int productId, int adminId)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null) return false;
            product.Status = "published";
            product.PublishedAt = DateTime.UtcNow;
            product.RejectionReason = null;
            await _context.SaveChangesAsync();
            await AddModerationLogAsync(new ModerationLog
            {
                ProductId = productId,
                AdminId = adminId,
                Action = "approved",
                Timestamp = DateTime.UtcNow
            });
            return true;
        }

        public async Task<bool> RejectProductAsync(int productId, int adminId, string reason)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null) return false;
            product.Status = "rejected";
            product.RejectionReason = reason;
            await _context.SaveChangesAsync();
            await AddModerationLogAsync(new ModerationLog
            {
                ProductId = productId,
                AdminId = adminId,
                Action = "rejected",
                Reason = reason,
                Timestamp = DateTime.UtcNow
            });
            return true;
        }

        public async Task AddModerationLogAsync(ModerationLog log)
        {
            _context.ModerationLogs.Add(log);
            await _context.SaveChangesAsync();
        }

        // --- Product File Management ---
        public async Task<AddedFile> AddProductFileAsync(int productId, string name, string fileUrl, long size, string contentType)
        {
            var file = new AddedFile
            {
                ProductId = productId,
                Name = name,
                FileUrl = fileUrl,
                Size = size,
                ContentType = contentType
            };
            _context.Files.Add(file);
            await _context.SaveChangesAsync();
            return file;
        }

        public async Task<List<AddedFile>> GetProductFilesAsync(int productId)
        {
            return await _context.Files.Where(f => f.ProductId == productId).ToListAsync();
        }

        public async Task<bool> DeleteProductFileAsync(int productId, int fileId)
        {
            var file = await _context.Files.FirstOrDefaultAsync(f => f.Id == fileId && f.ProductId == productId);
            if (file == null) return false;
            _context.Files.Remove(file);
            await _context.SaveChangesAsync();
            return true;
        }

        // --- Soft Delete Operations ---
        public async Task<bool> HasProductPurchasesAsync(int productId)
        {
            // Check if product has any order items (purchases)
            return await _context.OrderItems
                .AnyAsync(oi => oi.ProductId == productId);
        }

        public async Task SoftDeleteProductAsync(int productId, string deletionReason)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product != null)
            {
                product.IsDeleted = true;
                product.DeletedAt = DateTime.UtcNow;
                product.DeletionReason = deletionReason;
                product.DeletionScheduledAt = DateTime.UtcNow.AddDays(30); // 30 days retention period
                product.Status = "deleted"; // Hide from public listings

                await _context.SaveChangesAsync();
            }
        }

        public async Task RestoreProductAsync(int productId)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product != null)
            {
                product.IsDeleted = false;
                product.DeletedAt = null;
                product.DeletionReason = null;
                product.DeletionScheduledAt = null;
                product.Status = "draft"; // Restore to draft status

                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<Product>> GetSoftDeletedProductsAsync()
        {
            return await _context.Products
                .Where(p => p.IsDeleted)
                .Include(p => p.Creator)
                .OrderByDescending(p => p.DeletedAt)
                .ToListAsync();
        }

        public async Task PermanentlyDeleteProductAsync(int productId)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product != null)
            {
                _context.Products.Remove(product);
                await _context.SaveChangesAsync();
            }
        }
    }
}
