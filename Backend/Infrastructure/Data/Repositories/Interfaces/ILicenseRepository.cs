using Raqmiya.Infrastructure;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Core.Interfaces
{
    public interface ILicenseRepository
    {
        Task<License?> GetByIdAsync(int id);
        Task<List<License>> GetActiveLicensesByUserIdAsync(int userId);
        Task<List<License>> GetLicensesByUserIdAsync(int userId);
        Task<License?> GetLicenseByUserAndProductAsync(int userId, int productId);
        Task<License?> GetByLicenseKeyAsync(string licenseKey);
        Task AddAsync(License license);
        Task UpdateAsync(License license);
        Task DeleteAsync(License license);
    }
} 