using Microsoft.EntityFrameworkCore;
using System;

namespace Raqmiya.Infrastructure
{
    public class CategoryRepository : ICategoryRepository
    {
        private readonly RaqmiyaDbContext _context;

        public CategoryRepository(RaqmiyaDbContext context)
        {
            _context = context;
        }

        public async Task<List<Category>> GetAllCategoriesAsync()
        {
            return await _context.Categories.AsNoTracking().ToListAsync();
        }

        public async Task<List<Category>> GetCategoriesHierarchyAsync()
        {
            // Get all categories with their subcategories
            var allCategories = await _context.Categories
                .Include(c => c.Subcategories)
                .ThenInclude(sc => sc.Subcategories) // Include sub-subcategories
                .AsNoTracking()
                .ToListAsync();

            // Return only root categories (those without parent)
            return allCategories.Where(c => c.ParentCategoryId == null).ToList();
        }

        public async Task<List<Category>> GetChildCategoriesAsync(int parentId)
        {
            return await _context.Categories
                .Where(c => c.ParentCategoryId == parentId)
                .Include(c => c.Subcategories)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<int>> GetAllNestedCategoryIdsAsync(int categoryId)
        {
            var categoryIds = new List<int> { categoryId };
            
            // Recursively get all nested category IDs
            await GetNestedCategoryIdsRecursive(categoryId, categoryIds);
            
            return categoryIds;
        }

        private async Task GetNestedCategoryIdsRecursive(int parentId, List<int> categoryIds)
        {
            var childCategories = await _context.Categories
                .Where(c => c.ParentCategoryId == parentId)
                .Select(c => c.Id)
                .ToListAsync();

            foreach (var childId in childCategories)
            {
                if (!categoryIds.Contains(childId))
                {
                    categoryIds.Add(childId);
                    await GetNestedCategoryIdsRecursive(childId, categoryIds);
                }
            }
        }

        public async Task<Category?> GetByIdAsync(int id)
        {
            return await _context.Categories.FindAsync(id);
        }

        public async Task<bool> ExistsAsync(int id)
        {
            return await _context.Categories.AnyAsync(c => c.Id == id);
        }

        public async Task AddAsync(Category category)
        {
            await _context.Categories.AddAsync(category);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Category category)
        {
            _context.Categories.Update(category);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Category category)
        {
            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();
        }
    }
}
