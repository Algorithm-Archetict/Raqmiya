using Shared.DTOs;

namespace Core.Interfaces
{
    public interface IPlatformAnalyticsService
    {
        Task<PlatformRevenueSummaryDTO> GetSummaryAsync(string currency = "USD");
        Task<List<MonthlyRevenuePointDTO>> GetMonthlySeriesAsync(string currency = "USD");
        Task<List<TopEntityDTO>> GetTopCreatorsAsync(int count = 10, string currency = "USD");
        Task<List<TopEntityDTO>> GetTopProductsAsync(int count = 10, string currency = "USD");
    Task<List<PlatformCommissionDTO>> GetRecentPlatformCommissionsAsync(int count = 50, string currency = "USD");
    }
}


