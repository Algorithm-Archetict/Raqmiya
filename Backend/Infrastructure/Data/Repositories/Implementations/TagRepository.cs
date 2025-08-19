
using Microsoft.EntityFrameworkCore;
using System;

namespace Raqmiya.Infrastructure
{
    public class TagRepository : ITagRepository
    {
        private readonly RaqmiyaDbContext _context;

        public TagRepository(RaqmiyaDbContext context)
        {
            _context = context;
        }

        public async Task<List<Tag>> GetAllTagsAsync()
        {
            return await _context.Tags.AsNoTracking().ToListAsync();
        }

        public async Task<Tag?> GetByIdAsync(int id)
        {
            return await _context.Tags.FindAsync(id);
        }

        public async Task<bool> ExistsAsync(int id)
        {
            return await _context.Tags.AnyAsync(t => t.Id == id);
        }

        public async Task<List<Tag>> GetTagsByCategoriesAsync(IEnumerable<int> categoryIds)
        {
            var allCategoryIds = new HashSet<int>(categoryIds);
            var fallbackCategoryIds = new HashSet<int>();

            // First, get all categories with their parent information
            var categories = await _context.Categories
                .Where(c => categoryIds.Contains(c.Id))
                .Select(c => new { c.Id, c.ParentCategoryId })
                .AsNoTracking()
                .ToListAsync();

            // For each category, check if it has tags
            foreach (var category in categories)
            {
                var hasTags = await _context.CategoryTags
                    .AnyAsync(ct => ct.CategoryId == category.Id);

                // If category has no tags and has a parent, add parent to fallback list
                if (!hasTags && category.ParentCategoryId.HasValue)
                {
                    fallbackCategoryIds.Add(category.ParentCategoryId.Value);
                }
            }

            // Combine original category IDs with fallback parent category IDs
            allCategoryIds.UnionWith(fallbackCategoryIds);

            // Get tags for all categories (original + fallback parents)
            return await _context.Tags
                .Where(t => t.CategoryTags.Any(ct => allCategoryIds.Contains(ct.CategoryId)))
                .Distinct()
                .AsNoTracking()
                .ToListAsync();
        }
    }
}
