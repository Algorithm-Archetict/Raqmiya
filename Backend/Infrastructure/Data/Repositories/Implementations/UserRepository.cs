using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace Raqmiya.Infrastructure
{
    public class UserRepository : IUserRepository
    {
        private readonly RaqmiyaDbContext _context;

        public UserRepository(RaqmiyaDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<User?> GetByIdAsync(int id) => await _context.Users.FindAsync(id);

        public async Task<User?> GetUserByEmailAsync(string email) => await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

        public async Task<User?> GetUserByUsernameAsync(string username) => await _context.Users.FirstOrDefaultAsync(u => u.Username == username);

        public async Task<User?> GetUserByEmailOrUsernameAsync(string identifier) => await _context.Users.FirstOrDefaultAsync(u => u.Email == identifier || u.Username == identifier);

        public async Task<bool> UserExistsByEmailAsync(string email) => await _context.Users.AnyAsync(u => u.Email == email);

        public async Task<bool> UserExistsByUsernameAsync(string username) => await _context.Users.AnyAsync(u => u.Username == username);

        public async Task AddAsync(User user) { await _context.Users.AddAsync(user); await _context.SaveChangesAsync(); }

        public async Task UpdateAsync(User user) { _context.Users.Update(user); await _context.SaveChangesAsync(); }

        public async Task<List<User>> GetAllAsync() => await _context.Users.ToListAsync();

        public async Task<List<User>> SearchCreatorsAsync(string? query, int take = 50, int skip = 0)
        {
            var q = _context.Users
                .AsNoTracking()
                .Where(u => u.Role == "Creator" && u.IsActive && !u.IsDeleted);

            if (!string.IsNullOrWhiteSpace(query))
            {
                var term = query.Trim().ToLower();
                q = q.Where(u => (u.Username ?? "").ToLower().Contains(term));
            }

            return await q
                .OrderBy(u => u.Username)
                .Skip(skip)
                .Take(take)
                .ToListAsync();
        }
    }
}
