using Infrastructure.Data.Entities;
using Infrastructure.Data.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Raqmiya.Infrastructure;

namespace Infrastructure.Data.Repositories.Implementations
{
    public class AccountDeletionRepository : IAccountDeletionRepository
    {
        private readonly RaqmiyaDbContext _context;

        public AccountDeletionRepository(RaqmiyaDbContext context)
        {
            _context = context;
        }

        public async Task<AccountDeletionToken?> GetByTokenAsync(string token)
        {
            return await _context.AccountDeletionTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Token == token);
        }

        public async Task<AccountDeletionToken?> GetByUserIdAsync(int userId)
        {
            return await _context.AccountDeletionTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.UserId == userId);
        }

        public async Task<AccountDeletionToken> CreateAsync(AccountDeletionToken token)
        {
            _context.AccountDeletionTokens.Add(token);
            await _context.SaveChangesAsync();
            return token;
        }

        public async Task<AccountDeletionToken> UpdateAsync(AccountDeletionToken token)
        {
            _context.AccountDeletionTokens.Update(token);
            await _context.SaveChangesAsync();
            return token;
        }

        public async Task DeleteAsync(AccountDeletionToken token)
        {
            _context.AccountDeletionTokens.Remove(token);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteExpiredAsync()
        {
            var expiredTokens = await _context.AccountDeletionTokens
                .Where(t => t.ExpiresAt < DateTime.UtcNow)
                .ToListAsync();

            _context.AccountDeletionTokens.RemoveRange(expiredTokens);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> IsTokenValidAsync(string token)
        {
            var tokenEntity = await GetByTokenAsync(token);
            return tokenEntity != null && 
                   !tokenEntity.IsUsed && 
                   tokenEntity.ExpiresAt > DateTime.UtcNow;
        }

        public async Task SoftDeleteUserAsync(int userId, string reason)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                user.IsDeleted = true;
                user.DeletedAt = DateTime.UtcNow;
                user.DeletionReason = reason;
                user.DeletionScheduledAt = DateTime.UtcNow.AddDays(30); // 30 days retention period
                user.IsActive = false; // Hide immediately from other users

                await _context.SaveChangesAsync();
            }
        }

        public async Task RestoreUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                user.IsDeleted = false;
                user.DeletedAt = null;
                user.DeletionReason = null;
                user.DeletionScheduledAt = null;
                user.IsActive = true; // Make visible again

                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<User>> GetUsersScheduledForPermanentDeletionAsync()
        {
            return await _context.Users
                .Where(u => u.IsDeleted && 
                           u.DeletionScheduledAt.HasValue && 
                           u.DeletionScheduledAt <= DateTime.UtcNow)
                .ToListAsync();
        }

        public async Task PermanentlyDeleteUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
            }
        }
    }
}
