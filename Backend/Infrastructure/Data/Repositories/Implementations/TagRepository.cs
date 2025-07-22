using ITI_Raqmiya_MVC.Data;
using ITI_Raqmiya_MVC.Models;
using ITI_Raqmiya_MVC.Repository.Repository_Interface;
using Microsoft.EntityFrameworkCore;
using System;

namespace ITI_Raqmiya_MVC.Repository.Repos_Implementation
{
    public class TagRepository : ITagRepository
    {
        private readonly RaqmiyaContext _context;

        public TagRepository(RaqmiyaContext context)
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
    }
}
