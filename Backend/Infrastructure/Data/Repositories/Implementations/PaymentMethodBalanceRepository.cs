using Microsoft.EntityFrameworkCore;
using Raqmiya.Infrastructure;

namespace Raqmiya.Infrastructure
{
    public class PaymentMethodBalanceRepository : IPaymentMethodBalanceRepository
    {
        private readonly RaqmiyaDbContext _context;

        public PaymentMethodBalanceRepository(RaqmiyaDbContext context)
        {
            _context = context;
        }

        public async Task<PaymentMethodBalance?> GetByIdAsync(int id)
        {
            return await _context.PaymentMethodBalances
                .Include(pmb => pmb.User)
                .FirstOrDefaultAsync(pmb => pmb.Id == id);
        }

        public async Task<List<PaymentMethodBalance>> GetByUserIdAsync(int userId)
        {
            return await _context.PaymentMethodBalances
                .Where(pmb => pmb.UserId == userId)
                .OrderByDescending(pmb => pmb.IsSelected)
                .ThenBy(pmb => pmb.CreatedAt)
                .ToListAsync();
        }

        public async Task<PaymentMethodBalance?> GetSelectedByUserIdAsync(int userId)
        {
            return await _context.PaymentMethodBalances
                .FirstOrDefaultAsync(pmb => pmb.UserId == userId && pmb.IsSelected);
        }

        public async Task<PaymentMethodBalance?> GetByPaymentMethodIdAsync(string paymentMethodId)
        {
            return await _context.PaymentMethodBalances
                .FirstOrDefaultAsync(pmb => pmb.PaymentMethodId == paymentMethodId);
        }

        public async Task<PaymentMethodBalance> AddAsync(PaymentMethodBalance balance)
        {
            // If this is the first payment method for the user, make it selected
            var existingBalances = await _context.PaymentMethodBalances
                .Where(pmb => pmb.UserId == balance.UserId)
                .CountAsync();
            
            if (existingBalances == 0)
            {
                balance.IsSelected = true;
            }

            _context.PaymentMethodBalances.Add(balance);
            await _context.SaveChangesAsync();
            return balance;
        }

        public async Task<PaymentMethodBalance> UpdateAsync(PaymentMethodBalance balance)
        {
            balance.LastUpdated = DateTime.UtcNow;
            _context.PaymentMethodBalances.Update(balance);
            await _context.SaveChangesAsync();
            return balance;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var balance = await _context.PaymentMethodBalances.FindAsync(id);
            if (balance == null) return false;

            // If deleting the selected balance, select another one
            if (balance.IsSelected)
            {
                var otherBalance = await _context.PaymentMethodBalances
                    .Where(pmb => pmb.UserId == balance.UserId && pmb.Id != id)
                    .FirstOrDefaultAsync();
                
                if (otherBalance != null)
                {
                    otherBalance.IsSelected = true;
                    _context.PaymentMethodBalances.Update(otherBalance);
                }
            }

            _context.PaymentMethodBalances.Remove(balance);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SetSelectedAsync(int userId, int balanceId)
        {
            // First, unselect all balances for this user
            var allBalances = await _context.PaymentMethodBalances
                .Where(pmb => pmb.UserId == userId)
                .ToListAsync();

            foreach (var balance in allBalances)
            {
                balance.IsSelected = false;
                balance.LastUpdated = DateTime.UtcNow;
            }

            // Then select the specified balance
            var selectedBalance = allBalances.FirstOrDefault(pmb => pmb.Id == balanceId);
            if (selectedBalance != null)
            {
                selectedBalance.IsSelected = true;
                selectedBalance.LastUpdated = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return selectedBalance != null;
        }

        public async Task<decimal> GetTotalBalanceAsync(int userId, string currency = "USD")
        {
            var balances = await _context.PaymentMethodBalances
                .Where(pmb => pmb.UserId == userId)
                .ToListAsync();

            decimal totalBalance = 0;

            foreach (var balance in balances)
            {
                if (balance.Currency == currency)
                {
                    totalBalance += balance.Balance;
                }
                else
                {
                    // Convert to target currency
                    var convertedAmount = await ConvertCurrencyAsync(balance.Balance, balance.Currency, currency);
                    totalBalance += convertedAmount;
                }
            }

            return totalBalance;
        }

        public async Task<bool> UpdateBalanceAsync(int userId, string paymentMethodId, decimal amount, string currency = "USD")
        {
            var balance = await _context.PaymentMethodBalances
                .FirstOrDefaultAsync(pmb => pmb.UserId == userId && pmb.PaymentMethodId == paymentMethodId);

            if (balance == null) return false;

            balance.Balance += amount;
            balance.Currency = currency;
            balance.LastUpdated = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        private async Task<decimal> ConvertCurrencyAsync(decimal amount, string fromCurrency, string toCurrency)
        {
            // Simple conversion logic - in production, use a real currency service
            if (fromCurrency == toCurrency) return amount;

            if (fromCurrency == "USD" && toCurrency == "EGP")
                return amount * 50; // 1 USD = 50 EGP
            else if (fromCurrency == "EGP" && toCurrency == "USD")
                return amount * 0.02m; // 1 EGP = 0.02 USD

            return amount; // Default fallback
        }
    }
}






