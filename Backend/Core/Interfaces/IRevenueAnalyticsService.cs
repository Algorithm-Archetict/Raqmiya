using Shared.DTOs;

namespace Core.Interfaces
{
    public interface IRevenueAnalyticsService
    {
        Task<CreatorRevenueAnalyticsDTO> GetCreatorRevenueAnalyticsAsync(int creatorId, string currency = "USD");
        Task<decimal> GetCreatorTotalRevenueAsync(int creatorId, string currency = "USD");
        Task<decimal> GetCreatorMonthlyRevenueAsync(int creatorId, string currency = "USD");
        Task<decimal> GetCreatorWeeklyRevenueAsync(int creatorId, string currency = "USD");
        Task<List<TopProductDTO>> GetCreatorTopProductsAsync(int creatorId, int count = 5, string currency = "USD");
        Task<decimal> ConvertCurrencyAsync(decimal amount, string fromCurrency, string toCurrency);
    }
}

