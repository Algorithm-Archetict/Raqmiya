
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

        public async Task<Category?> GetByIdAsync(int id)
        {
            return await _context.Categories.FindAsync(id);
        }

        public async Task<bool> ExistsAsync(int id)
        {
            return await _context.Categories.AnyAsync(c => c.Id == id);
        }
    }
}
