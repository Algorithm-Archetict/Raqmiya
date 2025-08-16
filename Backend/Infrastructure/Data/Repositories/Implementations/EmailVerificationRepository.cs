using Infrastructure.Data.Entities;
using Infrastructure.Data.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Raqmiya.Infrastructure;

namespace Infrastructure.Data.Repositories.Implementations
{
    public class EmailVerificationRepository : IEmailVerificationRepository
    {
        private readonly RaqmiyaDbContext _context;

        public EmailVerificationRepository(RaqmiyaDbContext context)
        {
            _context = context;
        }

        public async Task<EmailVerificationToken?> GetByTokenAsync(string token)
        {
            return await _context.EmailVerificationTokens
                .FirstOrDefaultAsync(t => t.Token == token);
        }

        public async Task<EmailVerificationToken?> GetByEmailAsync(string email)
        {
            return await _context.EmailVerificationTokens
                .FirstOrDefaultAsync(t => t.Email == email);
        }

        public async Task<EmailVerificationToken> CreateAsync(EmailVerificationToken token)
        {
            _context.EmailVerificationTokens.Add(token);
            await _context.SaveChangesAsync();
            return token;
        }

        public async Task<EmailVerificationToken> UpdateAsync(EmailVerificationToken token)
        {
            _context.EmailVerificationTokens.Update(token);
            await _context.SaveChangesAsync();
            return token;
        }

        public async Task DeleteAsync(EmailVerificationToken token)
        {
            _context.EmailVerificationTokens.Remove(token);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteExpiredAsync()
        {
            var expiredTokens = await _context.EmailVerificationTokens
                .Where(t => t.ExpiresAt < DateTime.UtcNow)
                .ToListAsync();

            _context.EmailVerificationTokens.RemoveRange(expiredTokens);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> IsTokenValidAsync(string token)
        {
            var tokenEntity = await GetByTokenAsync(token);
            return tokenEntity != null && 
                   !tokenEntity.IsUsed && 
                   tokenEntity.ExpiresAt > DateTime.UtcNow;
        }
    }
}
