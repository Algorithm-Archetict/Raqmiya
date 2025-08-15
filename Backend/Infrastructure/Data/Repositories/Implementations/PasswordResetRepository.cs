using Infrastructure.Data.Entities;
using Infrastructure.Data.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Raqmiya.Infrastructure;

namespace Infrastructure.Data.Repositories.Implementations
{
    public class PasswordResetRepository : IPasswordResetRepository
    {
        private readonly RaqmiyaDbContext _context;
        private readonly ILogger<PasswordResetRepository> _logger;

        public PasswordResetRepository(RaqmiyaDbContext context, ILogger<PasswordResetRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<PasswordResetToken?> GetByTokenAsync(string token)
        {
            return await _context.PasswordResetTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Token == token);
        }

        public async Task<PasswordResetToken?> GetByUserIdAsync(int userId)
        {
            return await _context.PasswordResetTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.UserId == userId && !t.IsUsed);
        }

        public async Task<PasswordResetToken> CreateAsync(PasswordResetToken token)
        {
            _context.PasswordResetTokens.Add(token);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Created password reset token for user {UserId}", token.UserId);
            return token;
        }

        public async Task UpdateAsync(PasswordResetToken token)
        {
            _context.PasswordResetTokens.Update(token);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Updated password reset token {TokenId}", token.Id);
        }

        public async Task DeleteAsync(int id)
        {
            var token = await _context.PasswordResetTokens.FindAsync(id);
            if (token != null)
            {
                _context.PasswordResetTokens.Remove(token);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Deleted password reset token {TokenId}", id);
            }
        }

        public async Task DeleteExpiredTokensAsync()
        {
            var expiredTokens = await _context.PasswordResetTokens
                .Where(t => t.ExpiresAt < DateTime.UtcNow)
                .ToListAsync();

            if (expiredTokens.Any())
            {
                _context.PasswordResetTokens.RemoveRange(expiredTokens);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Deleted {Count} expired password reset tokens", expiredTokens.Count);
            }
        }

        public async Task<bool> IsTokenValidAsync(string token)
        {
            var resetToken = await GetByTokenAsync(token);
            return resetToken != null && 
                   !resetToken.IsUsed && 
                   resetToken.ExpiresAt > DateTime.UtcNow;
        }
    }
}
