using Core.Interfaces;
using Raqmiya.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Core.Services
{
    public class PurchaseValidationService : IPurchaseValidationService
    {
        private readonly RaqmiyaDbContext _context;
        private readonly ILogger<PurchaseValidationService> _logger;

        public PurchaseValidationService(RaqmiyaDbContext context, ILogger<PurchaseValidationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<bool> CanUserPurchaseProductAsync(int userId, int productId)
        {
            // Check if user already has an active license
            var activeLicense = await GetActiveLicenseAsync(userId, productId);
            if (activeLicense != null && activeLicense.IsActive)
            {
                _logger.LogInformation("User {UserId} already has active license for product {ProductId}", userId, productId);
                return false; // Already purchased and active
            }
            
            // Check if user has an expired license that can be renewed
            var expiredLicense = await GetExpiredLicenseAsync(userId, productId);
            if (expiredLicense != null && expiredLicense.CanRepurchase)
            {
                _logger.LogInformation("User {UserId} has expired license for product {ProductId} that can be renewed", userId, productId);
                return true; // Can repurchase expired license
            }
            
            // Check if user has never purchased this product
            var hasAnyLicense = await HasAnyLicenseAsync(userId, productId);
            if (!hasAnyLicense)
            {
                _logger.LogInformation("User {UserId} has never purchased product {ProductId}", userId, productId);
                return true; // Can purchase if never bought before
            }
            
            _logger.LogInformation("User {UserId} cannot purchase product {ProductId} - has existing license", userId, productId);
            return false;
        }

        public async Task<License?> GetActiveLicenseAsync(int userId, int productId)
        {
            return await _context.Licenses
                .Include(l => l.Product)
                .Include(l => l.Order)
                .FirstOrDefaultAsync(l => 
                    l.BuyerId == userId && 
                    l.ProductId == productId && 
                    l.Status == "active" &&
                    (l.ExpiresAt == null || l.ExpiresAt > DateTime.UtcNow));
        }

        public async Task<bool> HasActivePurchaseAsync(int userId, int productId)
        {
            var activeLicense = await GetActiveLicenseAsync(userId, productId);
            return activeLicense != null;
        }

        public async Task<License?> GetExpiredLicenseAsync(int userId, int productId)
        {
            return await _context.Licenses
                .Include(l => l.Product)
                .Include(l => l.Order)
                .FirstOrDefaultAsync(l => 
                    l.BuyerId == userId && 
                    l.ProductId == productId && 
                    (l.Status == "expired" || l.Status == "revoked"));
        }

        public async Task<bool> HasAnyLicenseAsync(int userId, int productId)
        {
            return await _context.Licenses
                .AnyAsync(l => l.BuyerId == userId && l.ProductId == productId);
        }
    }
} 