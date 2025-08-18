using Core.Interfaces;
using Raqmiya.Infrastructure;
using Shared.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Core.Services
{
    public class RevenueAnalyticsService : IRevenueAnalyticsService
    {
        private readonly RaqmiyaDbContext _context;
        private readonly ILogger<RevenueAnalyticsService> _logger;
        private readonly ICurrencyService _currencyService;

        public RevenueAnalyticsService(
            RaqmiyaDbContext context, 
            ILogger<RevenueAnalyticsService> logger,
            ICurrencyService currencyService)
        {
            _context = context;
            _logger = logger;
            _currencyService = currencyService;
        }

        public async Task<CreatorRevenueAnalyticsDTO> GetCreatorRevenueAnalyticsAsync(int creatorId, string currency = "USD")
        {
            try
            {
                var now = DateTime.UtcNow;
                var monthStart = new DateTime(now.Year, now.Month, 1);
                var weekStart = now.AddDays(-(int)now.DayOfWeek);

                _logger.LogInformation("Getting revenue analytics for creator {CreatorId} with currency {Currency}", creatorId, currency);

                // Get all orders for creator's products
                var creatorOrders = await _context.OrderItems
                    .Include(oi => oi.Order)
                    .Include(oi => oi.Product)
                    .Where(oi => oi.Product.CreatorId == creatorId && oi.Order.Status == "Completed")
                    .ToListAsync();

                _logger.LogInformation("Found {OrderCount} completed orders for creator {CreatorId}", creatorOrders.Count, creatorId);

                var totalSales = creatorOrders.Count;
                var totalRevenue = creatorOrders.Sum(oi => oi.Product.Price * oi.Quantity);
                var monthlyRevenue = creatorOrders
                    .Where(oi => oi.Order.OrderedAt >= monthStart)
                    .Sum(oi => oi.Product.Price * oi.Quantity);
                var weeklyRevenue = creatorOrders
                    .Where(oi => oi.Order.OrderedAt >= weekStart)
                    .Sum(oi => oi.Product.Price * oi.Quantity);

                _logger.LogInformation("Revenue calculations: Total={TotalRevenue}, Monthly={MonthlyRevenue}, Weekly={WeeklyRevenue}", 
                    totalRevenue, monthlyRevenue, weeklyRevenue);

                var averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

                // Get top products
                var topProducts = await GetCreatorTopProductsAsync(creatorId, 5, currency);

                // Convert currency if needed
                if (currency != "USD")
                {
                    totalRevenue = await _currencyService.ConvertCurrencyAsync(totalRevenue, "USD", currency);
                    monthlyRevenue = await _currencyService.ConvertCurrencyAsync(monthlyRevenue, "USD", currency);
                    weeklyRevenue = await _currencyService.ConvertCurrencyAsync(weeklyRevenue, "USD", currency);
                    averageOrderValue = await _currencyService.ConvertCurrencyAsync(averageOrderValue, "USD", currency);
                }

                return new CreatorRevenueAnalyticsDTO
                {
                    TotalSales = totalSales,
                    TotalRevenue = totalRevenue,
                    MonthlyRevenue = monthlyRevenue,
                    WeeklyRevenue = weeklyRevenue,
                    AverageOrderValue = averageOrderValue,
                    Currency = currency,
                    TopProducts = topProducts,
                    LastUpdated = now
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting revenue analytics for creator {CreatorId}", creatorId);
                throw;
            }
        }

        public async Task<decimal> GetCreatorTotalRevenueAsync(int creatorId, string currency = "USD")
        {
            try
            {
                var totalRevenue = await _context.OrderItems
                    .Include(oi => oi.Product)
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Product.CreatorId == creatorId && oi.Order.Status == "Completed")
                    .SumAsync(oi => oi.Product.Price * oi.Quantity);

                return await _currencyService.ConvertCurrencyAsync(totalRevenue, "USD", currency);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting total revenue for creator {CreatorId}", creatorId);
                throw;
            }
        }

        public async Task<decimal> GetCreatorMonthlyRevenueAsync(int creatorId, string currency = "USD")
        {
            try
            {
                var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
                
                var monthlyRevenue = await _context.OrderItems
                    .Include(oi => oi.Product)
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Product.CreatorId == creatorId && 
                                oi.Order.Status == "Completed" && 
                                oi.Order.OrderedAt >= monthStart)
                    .SumAsync(oi => oi.Product.Price * oi.Quantity);

                return await _currencyService.ConvertCurrencyAsync(monthlyRevenue, "USD", currency);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting monthly revenue for creator {CreatorId}", creatorId);
                throw;
            }
        }

        public async Task<decimal> GetCreatorWeeklyRevenueAsync(int creatorId, string currency = "USD")
        {
            try
            {
                var weekStart = DateTime.UtcNow.AddDays(-(int)DateTime.UtcNow.DayOfWeek);
                
                var weeklyRevenue = await _context.OrderItems
                    .Include(oi => oi.Product)
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Product.CreatorId == creatorId && 
                                oi.Order.Status == "Completed" && 
                                oi.Order.OrderedAt >= weekStart)
                    .SumAsync(oi => oi.Product.Price * oi.Quantity);

                return await _currencyService.ConvertCurrencyAsync(weeklyRevenue, "USD", currency);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting weekly revenue for creator {CreatorId}", creatorId);
                throw;
            }
        }

        public async Task<List<TopProductDTO>> GetCreatorTopProductsAsync(int creatorId, int count = 5, string currency = "USD")
        {
            try
            {
                var topProducts = await _context.OrderItems
                    .Include(oi => oi.Product)
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Product.CreatorId == creatorId && oi.Order.Status == "Completed")
                    .GroupBy(oi => new { oi.ProductId, oi.Product.Name })
                    .Select(g => new TopProductDTO
                    {
                        Id = g.Key.ProductId,
                        Name = g.Key.Name,
                        Sales = g.Sum(oi => oi.Quantity),
                        Revenue = g.Sum(oi => oi.Product.Price * oi.Quantity),
                        Currency = "USD"
                    })
                    .OrderByDescending(p => p.Revenue)
                    .Take(count)
                    .ToListAsync();

                // Convert currency if needed
                if (currency != "USD")
                {
                    foreach (var product in topProducts)
                    {
                        product.Revenue = await _currencyService.ConvertCurrencyAsync(product.Revenue, "USD", currency);
                        product.Currency = currency;
                    }
                }

                return topProducts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top products for creator {CreatorId}", creatorId);
                throw;
            }
        }

        public async Task<decimal> ConvertCurrencyAsync(decimal amount, string fromCurrency, string toCurrency)
        {
            return await _currencyService.ConvertCurrencyAsync(amount, fromCurrency, toCurrency);
        }

        public async Task<List<MonthlyRevenuePointDTO>> GetCreatorMonthlySeriesAsync(int creatorId, string currency = "USD")
        {
            try
            {
                var now = DateTime.UtcNow;
                var start = new DateTime(now.Year, now.Month, 1).AddMonths(-11); // inclusive start 11 months ago

                var raw = await _context.OrderItems
                    .Include(oi => oi.Product)
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Product.CreatorId == creatorId
                                 && oi.Order.Status == "Completed"
                                 && oi.Order.OrderedAt >= start)
                    .GroupBy(oi => new { oi.Order.OrderedAt.Year, oi.Order.OrderedAt.Month })
                    .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Revenue = g.Sum(oi => oi.UnitPrice * oi.Quantity) })
                    .ToListAsync();

                var series = new List<MonthlyRevenuePointDTO>();
                for (int i = 0; i < 12; i++)
                {
                    var dt = start.AddMonths(i);
                    var found = raw.FirstOrDefault(r => r.Year == dt.Year && r.Month == dt.Month);
                    var revenue = found?.Revenue ?? 0m;
                    series.Add(new MonthlyRevenuePointDTO
                    {
                        Year = dt.Year,
                        Month = dt.Month,
                        Revenue = revenue,
                        Currency = "USD"
                    });
                }

                if (currency != "USD")
                {
                    for (int i = 0; i < series.Count; i++)
                    {
                        series[i].Revenue = await _currencyService.ConvertCurrencyAsync(series[i].Revenue, "USD", currency);
                        series[i].Currency = currency;
                    }
                }

                return series;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting monthly series revenue for creator {CreatorId}", creatorId);
                throw;
            }
        }
    }
}
