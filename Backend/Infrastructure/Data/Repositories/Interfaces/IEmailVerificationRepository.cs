using Infrastructure.Data.Entities;

namespace Infrastructure.Data.Repositories.Interfaces
{
    public interface IEmailVerificationRepository
    {
        Task<EmailVerificationToken?> GetByTokenAsync(string token);
        Task<EmailVerificationToken?> GetByEmailAsync(string email);
        Task<EmailVerificationToken> CreateAsync(EmailVerificationToken token);
        Task<EmailVerificationToken> UpdateAsync(EmailVerificationToken token);
        Task DeleteAsync(EmailVerificationToken token);
        Task DeleteExpiredAsync();
        Task<bool> IsTokenValidAsync(string token);
    }
}
