using Infrastructure.Data.Entities;

namespace Infrastructure.Data.Repositories.Interfaces
{
    public interface IPasswordResetRepository
    {
        Task<PasswordResetToken?> GetByTokenAsync(string token);
        Task<PasswordResetToken?> GetByUserIdAsync(int userId);
        Task<PasswordResetToken> CreateAsync(PasswordResetToken token);
        Task UpdateAsync(PasswordResetToken token);
        Task DeleteAsync(int id);
        Task DeleteExpiredTokensAsync();
        Task<bool> IsTokenValidAsync(string token);
    }
}
