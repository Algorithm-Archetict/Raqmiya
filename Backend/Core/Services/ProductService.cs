using Core.Interfaces;
using Microsoft.Extensions.Logging;
using Raqmiya.Infrastructure;
using Shared.DTOs.ProductDTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Services
{
    public class ProductService : IProductService
    {
        private readonly IProductRepository _productRepository;
        private readonly ICategoryRepository _categoryRepository;
        private readonly ITagRepository _tagRepository;
        private readonly ILogger<ProductService> _logger;

        public ProductService(
            IProductRepository productRepository,
            ICategoryRepository categoryRepository,
            ITagRepository tagRepository,
            ILogger<ProductService> logger)
        {
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _tagRepository = tagRepository;
            _logger = logger;
        }

        // --- Helper for mapping (consider AutoMapper for complex scenarios) ---
        private ProductDetailDTO MapToProductDetailDTO(Product product, bool isInWishlist = false)
        {
            return new ProductDetailDTO
            {
                Id = product.Id,
                CreatorId = product.CreatorId,
                CreatorUsername = product.Creator?.Username ?? "N/A",
                Name = product.Name,
                Description = product.Description,
                Price = product.Price,
                Currency = product.Currency,
                ProductType = product.ProductType,
                CoverImageUrl = product.CoverImageUrl,
                PreviewVideoUrl = product.PreviewVideoUrl,
                PublishedAt = product.PublishedAt,
                Status = product.Status,
                IsPublic = product.IsPublic,
                Permalink = product.Permalink,
                Files = product.Files.Select(f => new FileDTO { Id = f.Id, Name = f.Name, FileUrl = f.FileUrl }).ToList(),
                Variants = product.Variants.Select(v => new VariantDTO { Id = v.Id, Name = v.Name, PriceAdjustment = v.PriceAdjustment }).ToList(),
                OfferCodes = product.OfferCodes.Select(oc => new OfferCodeDTO { Id = oc.Id, Code = oc.Code, DiscountValue = oc.DiscountValue }).ToList(),
                Reviews = product.Reviews.Select(r => new ReviewDTO { Id = r.Id, Rating = r.Rating, Comment = r.Comment, UserName = r.User?.Username ?? "Anonymous", CreatedAt = r.CreatedAt }).ToList(),
                Categories = product.ProductCategories.Select(pc => new CategoryDTO { Id = pc.Category.Id, Name = pc.Category.Name, ParentCategoryId = pc.Category.ParentCategoryId }).ToList(),
                Tags = product.ProductTags.Select(pt => new TagDTO { Id = pt.Tag.Id, Name = pt.Tag.Name }).ToList(),
                WishlistCount = product.WishlistItems.Count(),
                AverageRating = product.Reviews.Any() ? product.Reviews.Average(r => r.Rating) : 0,
                SalesCount = product.OrderItems.Count(),
                ViewsCount = product.ProductViews.Count(),
                IsInWishlist = isInWishlist
            };
        }

        private ProductListItemDTO MapToProductListItemDTO(Product product)
        {
            return new ProductListItemDTO
            {
                Id = product.Id,
                Name = product.Name,
                Permalink = product.Permalink,
                Price = product.Price,
                Currency = product.Currency,
                CoverImageUrl = product.CoverImageUrl,
                CreatorUsername = product.Creator?.Username ?? "N/A",
                AverageRating = product.Reviews.Any() ? product.Reviews.Average(r => r.Rating) : 0,
                SalesCount = product.OrderItems.Count(),
                Status = product.Status,
                IsPublic = product.IsPublic
            };
        }

        // --- Publicly accessible product listings ---

        public async Task<PagedResultDTO<ProductListItemDTO>> GetPublishedProductsAsync(int pageNumber, int pageSize)
        {
            var products = await _productRepository.GetPublishedProductsAsync(pageNumber, pageSize);
            var totalProducts = await _productRepository.GetPublishedProductsCountAsync();
            var totalPages = (int)Math.Ceiling((double)totalProducts / pageSize);

            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = products.Select(MapToProductListItemDTO).ToList(),
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = totalPages,
                TotalCount = (int)totalProducts
            };
        }

        public async Task<ProductDetailDTO?> GetProductDetailsByPermalinkAsync(string permalink, int? userId = null)
        {
            var product = await _productRepository.GetProductWithAllDetailsByPermalinkAsync(permalink); // You'll need to add this to IProductRepository
            if (product == null || product.Status != "published" || !product.IsPublic)
            {
                return null;
            }

            // Record a view for this product
            // This is business logic, so it belongs here or in a dedicated analytics service
            await _productRepository.RecordProductViewAsync(product.Id, userId, null); // IP Address would come from API Controller

            bool isInWishlist = userId.HasValue && await _productRepository.IsProductInUserWishlistAsync(userId.Value, product.Id);
            return MapToProductDetailDTO(product, isInWishlist);
        }

        public async Task<ProductDetailDTO?> GetProductDetailsByIdAsync(int productId, int? userId = null)
        {
            var product = await _productRepository.GetProductWithAllDetailsAsync(productId);
            if (product == null)
            {
                return null;
            }

            // Authorization check can be done here or in the controller if it's purely API route-based
            // For now, assuming controller will handle basic creator check for this endpoint.

            bool isInWishlist = userId.HasValue && await _productRepository.IsProductInUserWishlistAsync(userId.Value, product.Id);
            return MapToProductDetailDTO(product, isInWishlist);
        }

        // --- Creator-specific product management ---

        public async Task<PagedResultDTO<ProductListItemDTO>> GetCreatorProductsAsync(int creatorId, int pageNumber, int pageSize)
        {
            var products = await _productRepository.GetProductsByCreatorIdAsync(creatorId, pageNumber, pageSize);
            var totalProducts = await _productRepository.GetProductsByCreatorCountAsync(creatorId);
            var totalPages = (int)Math.Ceiling((double)totalProducts / pageSize);

            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = products.Select(MapToProductListItemDTO).ToList(),
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = totalPages,
                TotalCount = (int)totalProducts
            };
        }

        public async Task<ProductDetailDTO> CreateProductAsync(int creatorId, ProductCreateRequestDTO productDto)
        {
            // Business rule: Check if permalink already exists
            if (await _productRepository.PermalinkExistsAsync(productDto.Permalink)) // Add this to repo
            {
                throw new InvalidOperationException("A product with this permalink already exists.");
            }

            var newProduct = new Product
            {
                CreatorId = creatorId,
                Name = productDto.Name,
                Description = productDto.Description,
                Price = productDto.Price,
                Currency = productDto.Currency,
                ProductType = productDto.ProductType,
                CoverImageUrl = productDto.CoverImageUrl,
                PreviewVideoUrl = productDto.PreviewVideoUrl,
                IsPublic = productDto.IsPublic,
                Permalink = productDto.Permalink,
                Status = "draft", // Default status for new products
                PublishedAt = productDto.IsPublic ? DateTime.UtcNow : (DateTime?)null // Use UTC
            };

            // Add categories and tags
            foreach (var catId in productDto.CategoryIds)
            {
                if (!await _categoryRepository.ExistsAsync(catId))
                {
                    throw new ArgumentException($"Category with ID {catId} does not exist.");
                }
                newProduct.ProductCategories.Add(new ProductCategory { CategoryId = catId });
            }
            foreach (var tagId in productDto.TagIds)
            {
                if (!await _tagRepository.ExistsAsync(tagId))
                {
                    throw new ArgumentException($"Tag with ID {tagId} does not exist.");
                }
                newProduct.ProductTags.Add(new ProductTag { TagId = tagId });
            }

            await _productRepository.AddAsync(newProduct);

            // Re-fetch to ensure all relationships are loaded for DTO mapping
            var createdProduct = await _productRepository.GetProductWithAllDetailsAsync(newProduct.Id);
            if (createdProduct == null) throw new InvalidOperationException("Failed to retrieve newly created product.");

            return MapToProductDetailDTO(createdProduct);
        }

        public async Task<ProductDetailDTO> UpdateProductAsync(int productId, int creatorId, ProductUpdateRequestDTO productDto)
        {
            if (productId != productDto.Id)
            {
                throw new ArgumentException("Product ID in URL does not match ID in request body.");
            }

            var product = await _productRepository.GetProductWithAllDetailsAsync(productId);
            if (product == null)
            {
                throw new KeyNotFoundException($"Product with ID {productId} not found.");
            }

            if (product.CreatorId != creatorId)
            {
                throw new UnauthorizedAccessException("You are not authorized to update this product.");
            }

            // Business rule: Check if permalink changed and if new permalink already exists
            if (product.Permalink != productDto.Permalink && await _productRepository.PermalinkExistsAsync(productDto.Permalink))
            {
                throw new InvalidOperationException("Another product with this permalink already exists.");
            }

            product.Name = productDto.Name;
            product.Description = productDto.Description;
            product.Price = productDto.Price;
            product.Currency = productDto.Currency;
            product.ProductType = productDto.ProductType;
            product.CoverImageUrl = productDto.CoverImageUrl;
            product.PreviewVideoUrl = productDto.PreviewVideoUrl;
            product.Permalink = productDto.Permalink;
            product.Status = productDto.Status;

            if (product.IsPublic != productDto.IsPublic)
            {
                product.IsPublic = productDto.IsPublic;
                if (product.IsPublic && !product.PublishedAt.HasValue)
                {
                    product.PublishedAt = DateTime.UtcNow;
                }
            }

            // Update Categories
            var existingCategoryIds = product.ProductCategories.Select(pc => pc.CategoryId).ToList();
            var categoriesToAdd = productDto.CategoryIds.Except(existingCategoryIds).ToList();
            var categoriesToRemove = existingCategoryIds.Except(productDto.CategoryIds).ToList();

            foreach (var catId in categoriesToRemove)
            {
                var pcToRemove = product.ProductCategories.FirstOrDefault(pc => pc.CategoryId == catId);
                if (pcToRemove != null) product.ProductCategories.Remove(pcToRemove);
            }
            foreach (var catId in categoriesToAdd)
            {
                if (!await _categoryRepository.ExistsAsync(catId))
                {
                    throw new ArgumentException($"Category with ID {catId} does not exist.");
                }
                product.ProductCategories.Add(new ProductCategory { ProductId = product.Id, CategoryId = catId });
            }

            // Update Tags
            var existingTagIds = product.ProductTags.Select(pt => pt.TagId).ToList();
            var tagsToAdd = productDto.TagIds.Except(existingTagIds).ToList();
            var tagsToRemove = existingTagIds.Except(productDto.TagIds).ToList();

            foreach (var tagId in tagsToRemove)
            {
                var ptToRemove = product.ProductTags.FirstOrDefault(pt => pt.TagId == tagId);
                if (ptToRemove != null) product.ProductTags.Remove(ptToRemove);
            }
            foreach (var tagId in tagsToAdd)
            {
                if (!await _tagRepository.ExistsAsync(tagId))
                {
                    throw new ArgumentException($"Tag with ID {tagId} does not exist.");
                }
                product.ProductTags.Add(new ProductTag { ProductId = product.Id, TagId = tagId });
            }

            await _productRepository.UpdateAsync(product);

            // Re-fetch to ensure all relationships are loaded for DTO mapping
            var updatedProduct = await _productRepository.GetProductWithAllDetailsAsync(product.Id);
            if (updatedProduct == null) throw new InvalidOperationException("Failed to retrieve updated product.");

            return MapToProductDetailDTO(updatedProduct);
        }

        public async Task DeleteProductAsync(int productId, int creatorId)
        {
            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null)
            {
                throw new KeyNotFoundException($"Product with ID {productId} not found.");
            }

            if (product.CreatorId != creatorId)
            {
                throw new UnauthorizedAccessException("You are not authorized to delete this product.");
            }

            // Add any business rules before deletion (e.g., cannot delete if active sales)
            // if (product.OrderItems.Any(oi => oi.Order.Status == "active")) { ... throw new InvalidOperationException }

            await _productRepository.DeleteAsync(productId);
        }

        // --- Wishlist operations ---
        public async Task AddProductToWishlistAsync(int userId, int productId)
        {
            if (!await _productRepository.ExistsAsync(productId))
            {
                throw new KeyNotFoundException($"Product with ID {productId} not found.");
            }
            if (await _productRepository.IsProductInUserWishlistAsync(userId, productId))
            {
                throw new InvalidOperationException("Product is already in your wishlist.");
            }
            await _productRepository.AddProductToWishlistAsync(userId, productId);
        }

        public async Task RemoveProductFromWishlistAsync(int userId, int productId)
        {
            if (!await _productRepository.ExistsAsync(productId))
            {
                throw new KeyNotFoundException($"Product with ID {productId} not found.");
            }
            if (!await _productRepository.IsProductInUserWishlistAsync(userId, productId))
            {
                throw new InvalidOperationException("Product is not in your wishlist.");
            }
            await _productRepository.RemoveProductFromWishlistAsync(userId, productId);
        }

        public async Task<PagedResultDTO<ProductListItemDTO>> GetUserWishlistAsync(int userId, int pageNumber, int pageSize)
        {
            var products = await _productRepository.GetUserWishlistAsync(userId, pageNumber, pageSize);
            var totalCount = await _productRepository.GetUserWishlistCountAsync(userId);

            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = products.Select(MapToProductListItemDTO).ToList(),
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                // TotalCount = totalCount  error
                TotalCount = (int)totalCount
            };
        }

        // --- Analytics / Derived Metrics ---
        public async Task RecordProductViewAsync(int productId, int? userId, string? ipAddress)
        {
            // The service is responsible for knowing the IP source or receiving it from the controller
            await _productRepository.RecordProductViewAsync(productId, userId, ipAddress);
        }

        public async Task<PagedResultDTO<ProductListItemDTO>> GetMostWishedProductsAsync(int count, int pageNumber, int pageSize)
        {
            var products = await _productRepository.GetMostWishedProductsAsync(count, pageNumber, pageSize);
            var totalCount = await _productRepository.GetPublishedProductsCountAsync(); // Or a specific count for most wished
            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = products.Select(MapToProductListItemDTO).ToList(),
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                // TotalCount = totalCount  error
                TotalCount = (int)totalCount
            };
        }

        public async Task<PagedResultDTO<ProductListItemDTO>> GetTopRatedProductsAsync(int count, int pageNumber, int pageSize)
        {
            var products = await _productRepository.GetTopRatedProductsAsync(count, pageNumber, pageSize);
            var totalCount = await _productRepository.GetPublishedProductsCountAsync();
            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = products.Select(MapToProductListItemDTO).ToList(),
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                // TotalCount = totalCount  error
                TotalCount = (int)totalCount
            };
        }

        public async Task<PagedResultDTO<ProductListItemDTO>> GetBestSellingProductsAsync(int count, int pageNumber, int pageSize)
        {
            var products = await _productRepository.GetBestSellingProductsAsync(count, pageNumber, pageSize);
            var totalCount = await _productRepository.GetPublishedProductsCountAsync();
            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = products.Select(MapToProductListItemDTO).ToList(),
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                // TotalCount = totalCount  error
                TotalCount = (int)totalCount
            };
        }

        public async Task<PagedResultDTO<ProductListItemDTO>> GetTrendyProductsAsync(int count, int daysBack, int pageNumber, int pageSize)
        {
            var products = await _productRepository.GetTrendyProductsAsync(count, daysBack, pageNumber, pageSize);
            var totalCount = await _productRepository.GetPublishedProductsCountAsync();
            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = products.Select(MapToProductListItemDTO).ToList(),
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                // TotalCount = totalCount  error
                TotalCount = (int)totalCount
            };
        }

        public async Task<List<CategoryDTO>> GetAllCategoriesAsync()
        {
            var categories = await _categoryRepository.GetAllCategoriesAsync();
            return categories.Select(c => new CategoryDTO { Id = c.Id, Name = c.Name, ParentCategoryId = c.ParentCategoryId }).ToList();
        }

        public async Task<List<TagDTO>> GetAllTagsAsync()
        {
            var tags = await _tagRepository.GetAllTagsAsync();
            return tags.Select(t => new TagDTO { Id = t.Id, Name = t.Name }).ToList();
        }

        public async Task<List<TagDTO>> GetTagsForCategoriesAsync(List<int> categoryIds)
        {
            // This method would get tags specifically linked to the provided category IDs
            // You might need a new repository method for this:
            // IProductRepository.GetTagsByCategoriesAsync(IEnumerable<int> categoryIds)
            // For now, returning all tags or a placeholder.
            _logger.LogWarning("GetTagsForCategoriesAsync not fully implemented - returns all tags or placeholder.");
            return await GetAllTagsAsync(); // Placeholder
        }

        public async Task<PagedResultDTO<ProductListItemDTO>> GetProductsByCategoryAsync(int categoryId, int pageNumber, int pageSize)
        {
            var products = await _productRepository.GetProductsByCategoryIdAsync(categoryId, pageNumber, pageSize);
            var totalProducts = products.Count(); // For now, use returned count; for large sets, use a count query
            var totalPages = (int)Math.Ceiling((double)totalProducts / pageSize);
            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = products.Select(MapToProductListItemDTO).ToList(),
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = totalPages,
                TotalCount = totalProducts
            };
        }

        public async Task<PagedResultDTO<ProductListItemDTO>> GetProductsByTagAsync(int tagId, int pageNumber, int pageSize)
        {
            var products = await _productRepository.GetProductsByTagIdAsync(tagId, pageNumber, pageSize);
            var totalProducts = products.Count();
            var totalPages = (int)Math.Ceiling((double)totalProducts / pageSize);
            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = products.Select(MapToProductListItemDTO).ToList(),
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = totalPages,
                TotalCount = totalProducts
            };
        }

        public async Task<PagedResultDTO<ProductListItemDTO>> SearchProductsAsync(string search, int pageNumber, int pageSize)
        {
            var products = await _productRepository.SearchProductsAsync(search, pageNumber, pageSize);
            var totalProducts = products.Count();
            var totalPages = (int)Math.Ceiling((double)totalProducts / pageSize);
            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = products.Select(MapToProductListItemDTO).ToList(),
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = totalPages,
                TotalCount = totalProducts
            };
        }

        // --- Product File Management ---
        public async Task<FileDTO> AddProductFileAsync(int productId, int creatorId, string originalName, string fileUrl, long size, string contentType)
        {
            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null)
                throw new KeyNotFoundException("Product not found.");
            if (product.CreatorId != creatorId)
                throw new UnauthorizedAccessException("You are not authorized to add files to this product.");
            var file = await _productRepository.AddProductFileAsync(productId, originalName, fileUrl, size, contentType);
            return new FileDTO { Id = file.Id, Name = file.Name, FileUrl = file.FileUrl };
        }

        public async Task<List<FileDTO>> GetProductFilesAsync(int productId)
        {
            var files = await _productRepository.GetProductFilesAsync(productId);
            return files.Select(f => new FileDTO { Id = f.Id, Name = f.Name, FileUrl = f.FileUrl }).ToList();
        }

        public async Task<bool> DeleteProductFileAsync(int productId, int fileId, int creatorId)
        {
            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null)
                throw new KeyNotFoundException("Product not found.");
            if (product.CreatorId != creatorId)
                throw new UnauthorizedAccessException("You are not authorized to delete files from this product.");
            return await _productRepository.DeleteProductFileAsync(productId, fileId);
        }

        // --- Admin Moderation ---
        public async Task<PagedResultDTO<ProductListItemDTO>> GetProductsByStatusAsync(string status, int pageNumber, int pageSize)
        {
            var products = await _productRepository.GetProductsByStatusAsync(status, pageNumber, pageSize);
            var total = products.Count;
            var items = products.Select(p => new ProductListItemDTO
            {
                Id = p.Id,
                Name = p.Name,
                Status = p.Status,
                CreatorUsername = p.Creator.Username,
                PublishedAt = p.PublishedAt,
                Price = p.Price,
                Currency = p.Currency
            }).ToList();
            return new PagedResultDTO<ProductListItemDTO>
            {
                Items = items,
                TotalCount = total,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<bool> ApproveProductAsync(int productId, int adminId)
        {
            return await _productRepository.ApproveProductAsync(productId, adminId);
        }

        public async Task<bool> RejectProductAsync(int productId, int adminId, string reason)
        {
            return await _productRepository.RejectProductAsync(productId, adminId, reason);
        }
    }
}
