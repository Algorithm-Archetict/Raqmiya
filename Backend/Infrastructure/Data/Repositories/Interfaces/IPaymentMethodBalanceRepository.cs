using Raqmiya.Infrastructure;

namespace Raqmiya.Infrastructure
{
    public interface IPaymentMethodBalanceRepository
    {
        Task<PaymentMethodBalance?> GetByIdAsync(int id);
        Task<List<PaymentMethodBalance>> GetByUserIdAsync(int userId);
        Task<PaymentMethodBalance?> GetSelectedByUserIdAsync(int userId);
        Task<PaymentMethodBalance?> GetByPaymentMethodIdAsync(string paymentMethodId);
        Task<PaymentMethodBalance> AddAsync(PaymentMethodBalance balance);
        Task<PaymentMethodBalance> UpdateAsync(PaymentMethodBalance balance);
        Task<bool> DeleteAsync(int id);
        Task<bool> SetSelectedAsync(int userId, int balanceId);
        Task<decimal> GetTotalBalanceAsync(int userId, string currency = "USD");
        Task<bool> UpdateBalanceAsync(int userId, string paymentMethodId, decimal amount, string currency = "USD");
    }
}






