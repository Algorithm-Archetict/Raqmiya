using Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using Raqmiya.Infrastructure;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Raqmiya.Infrastructure
{
    public class LicenseRepository : ILicenseRepository
    {
        private readonly RaqmiyaDbContext _context;

        public LicenseRepository(RaqmiyaDbContext context)
        {
            _context = context;
        }

        public async Task<License?> GetByIdAsync(int id)
        {
            return await _context.Licenses
                .Include(l => l.Product)
                .Include(l => l.Order)
                .Include(l => l.Buyer)
                .FirstOrDefaultAsync(l => l.Id == id);
        }

        public async Task<List<License>> GetActiveLicensesByUserIdAsync(int userId)
        {
            return await _context.Licenses
                .Include(l => l.Product)
                .Include(l => l.Order)
                .Include(l => l.Buyer)
                .Where(l => l.BuyerId == userId && l.Status == "active")
                .ToListAsync();
        }

        public async Task<List<License>> GetLicensesByUserIdAsync(int userId)
        {
            return await _context.Licenses
                .Include(l => l.Product)
                .Include(l => l.Order)
                .Include(l => l.Buyer)
                .Where(l => l.BuyerId == userId)
                .ToListAsync();
        }

        public async Task<License?> GetLicenseByUserAndProductAsync(int userId, int productId)
        {
            return await _context.Licenses
                .Include(l => l.Product)
                .Include(l => l.Order)
                .Include(l => l.Buyer)
                .FirstOrDefaultAsync(l => l.BuyerId == userId && l.ProductId == productId);
        }

        public async Task<License?> GetByLicenseKeyAsync(string licenseKey)
        {
            return await _context.Licenses
                .Include(l => l.Product)
                .Include(l => l.Order)
                .Include(l => l.Buyer)
                .FirstOrDefaultAsync(l => l.LicenseKey == licenseKey);
        }

        public async Task AddAsync(License license)
        {
            await _context.Licenses.AddAsync(license);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(License license)
        {
            _context.Licenses.Update(license);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(License license)
        {
            _context.Licenses.Remove(license);
            await _context.SaveChangesAsync();
        }
    }
} 