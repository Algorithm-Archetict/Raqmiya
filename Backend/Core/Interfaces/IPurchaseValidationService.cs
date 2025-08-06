using System.Threading.Tasks;
using Raqmiya.Infrastructure;

namespace Core.Interfaces
{
    public interface IPurchaseValidationService
    {
        Task<bool> CanUserPurchaseProductAsync(int userId, int productId);
        Task<License?> GetActiveLicenseAsync(int userId, int productId);
        Task<bool> HasActivePurchaseAsync(int userId, int productId);
        Task<License?> GetExpiredLicenseAsync(int userId, int productId);
        Task<bool> HasAnyLicenseAsync(int userId, int productId);
    }
} 