using Infrastructure.Data.Entities;
using Raqmiya.Infrastructure;

namespace Infrastructure.Data.Repositories.Interfaces
{
    public interface IAccountDeletionRepository
    {
        Task<AccountDeletionToken?> GetByTokenAsync(string token);
        Task<AccountDeletionToken?> GetByUserIdAsync(int userId);
        Task<AccountDeletionToken> CreateAsync(AccountDeletionToken token);
        Task<AccountDeletionToken> UpdateAsync(AccountDeletionToken token);
        Task DeleteAsync(AccountDeletionToken token);
        Task DeleteExpiredAsync();
        Task<bool> IsTokenValidAsync(string token);
        Task SoftDeleteUserAsync(int userId, string reason);
        Task RestoreUserAsync(int userId);
        Task<List<User>> GetUsersScheduledForPermanentDeletionAsync();
        Task PermanentlyDeleteUserAsync(int userId);
    }
}
