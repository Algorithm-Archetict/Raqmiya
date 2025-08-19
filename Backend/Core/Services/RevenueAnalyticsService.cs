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
                
                // Calculate revenue by converting each product's price from its original currency to USD first
                var totalRevenueUSD = 0m;
                var monthlyRevenueUSD = 0m;
                var weeklyRevenueUSD = 0m;
                
                foreach (var orderItem in creatorOrders)
                {
                    var itemRevenueUSD = await _currencyService.ConvertCurrencyAsync(
                        orderItem.Product.Price * orderItem.Quantity, 
                        orderItem.Product.Currency, 
                        "USD"
                    );
                    totalRevenueUSD += itemRevenueUSD;
                    
                    if (orderItem.Order.OrderedAt >= monthStart)
                    {
                        monthlyRevenueUSD += itemRevenueUSD;
                    }
                    
                    if (orderItem.Order.OrderedAt >= weekStart)
                    {
                        weeklyRevenueUSD += itemRevenueUSD;
                    }
                }

                _logger.LogInformation("Revenue calculations (USD): Total={TotalRevenue}, Monthly={MonthlyRevenue}, Weekly={WeeklyRevenue}", 
                    totalRevenueUSD, monthlyRevenueUSD, weeklyRevenueUSD);

                var averageOrderValueUSD = totalSales > 0 ? totalRevenueUSD / totalSales : 0;

                // Get top products
                var topProducts = await GetCreatorTopProductsAsync(creatorId, 5, currency);

                // Convert from USD to target currency if needed
                var totalRevenue = currency == "USD" ? totalRevenueUSD : await _currencyService.ConvertCurrencyAsync(totalRevenueUSD, "USD", currency);
                var monthlyRevenue = currency == "USD" ? monthlyRevenueUSD : await _currencyService.ConvertCurrencyAsync(monthlyRevenueUSD, "USD", currency);
                var weeklyRevenue = currency == "USD" ? weeklyRevenueUSD : await _currencyService.ConvertCurrencyAsync(weeklyRevenueUSD, "USD", currency);
                var averageOrderValue = currency == "USD" ? averageOrderValueUSD : await _currencyService.ConvertCurrencyAsync(averageOrderValueUSD, "USD", currency);

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
                var orderItems = await _context.OrderItems
                    .Include(oi => oi.Product)
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Product.CreatorId == creatorId && oi.Order.Status == "Completed")
                    .ToListAsync();

                var totalRevenueUSD = 0m;
                foreach (var orderItem in orderItems)
                {
                    var itemRevenueUSD = await _currencyService.ConvertCurrencyAsync(
                        orderItem.Product.Price * orderItem.Quantity,
                        orderItem.Product.Currency,
                        "USD"
                    );
                    totalRevenueUSD += itemRevenueUSD;
                }

                return await _currencyService.ConvertCurrencyAsync(totalRevenueUSD, "USD", currency);
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
                
                var orderItems = await _context.OrderItems
                    .Include(oi => oi.Product)
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Product.CreatorId == creatorId && 
                                oi.Order.Status == "Completed" && 
                                oi.Order.OrderedAt >= monthStart)
                    .ToListAsync();

                var monthlyRevenueUSD = 0m;
                foreach (var orderItem in orderItems)
                {
                    var itemRevenueUSD = await _currencyService.ConvertCurrencyAsync(
                        orderItem.Product.Price * orderItem.Quantity,
                        orderItem.Product.Currency,
                        "USD"
                    );
                    monthlyRevenueUSD += itemRevenueUSD;
                }

                return await _currencyService.ConvertCurrencyAsync(monthlyRevenueUSD, "USD", currency);
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
                
                var orderItems = await _context.OrderItems
                    .Include(oi => oi.Product)
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Product.CreatorId == creatorId && 
                                oi.Order.Status == "Completed" && 
                                oi.Order.OrderedAt >= weekStart)
                    .ToListAsync();

                var weeklyRevenueUSD = 0m;
                foreach (var orderItem in orderItems)
                {
                    var itemRevenueUSD = await _currencyService.ConvertCurrencyAsync(
                        orderItem.Product.Price * orderItem.Quantity,
                        orderItem.Product.Currency,
                        "USD"
                    );
                    weeklyRevenueUSD += itemRevenueUSD;
                }

                return await _currencyService.ConvertCurrencyAsync(weeklyRevenueUSD, "USD", currency);
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
                var orderItems = await _context.OrderItems
                    .Include(oi => oi.Product)
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Product.CreatorId == creatorId && oi.Order.Status == "Completed")
                    .ToListAsync();

                // Group by product and calculate revenue in USD first
                var productGroups = orderItems
                    .GroupBy(oi => new { oi.ProductId, oi.Product.Name })
                    .ToList();

                var topProducts = new List<TopProductDTO>();

                foreach (var group in productGroups)
                {
                    var totalSales = group.Sum(oi => oi.Quantity);
                    var revenueUSD = 0m;

                    foreach (var orderItem in group)
                    {
                        var itemRevenueUSD = await _currencyService.ConvertCurrencyAsync(
                            orderItem.Product.Price * orderItem.Quantity,
                            orderItem.Product.Currency,
                            "USD"
                        );
                        revenueUSD += itemRevenueUSD;
                    }

                    topProducts.Add(new TopProductDTO
                    {
                        Id = group.Key.ProductId,
                        Name = group.Key.Name,
                        Sales = totalSales,
                        Revenue = revenueUSD,
                        Currency = "USD"
                    });
                }

                // Sort by revenue and take top count
                topProducts = topProducts
                    .OrderByDescending(p => p.Revenue)
                    .Take(count)
                    .ToList();

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

                var orderItems = await _context.OrderItems
                    .Include(oi => oi.Product)
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Product.CreatorId == creatorId
                                 && oi.Order.Status == "Completed"
                                 && oi.Order.OrderedAt >= start)
                    .ToListAsync();

                // Group by month and calculate revenue in USD first
                var monthlyGroups = orderItems
                    .GroupBy(oi => new { oi.Order.OrderedAt.Year, oi.Order.OrderedAt.Month })
                    .ToList();

                var monthlyRevenueUSD = new Dictionary<(int Year, int Month), decimal>();

                foreach (var group in monthlyGroups)
                {
                    var monthKey = (group.Key.Year, group.Key.Month);
                    var revenueUSD = 0m;

                    foreach (var orderItem in group)
                    {
                        var itemRevenueUSD = await _currencyService.ConvertCurrencyAsync(
                            orderItem.Product.Price * orderItem.Quantity,
                            orderItem.Product.Currency,
                            "USD"
                        );
                        revenueUSD += itemRevenueUSD;
                    }

                    monthlyRevenueUSD[monthKey] = revenueUSD;
                }

                var series = new List<MonthlyRevenuePointDTO>();
                for (int i = 0; i < 12; i++)
                {
                    var dt = start.AddMonths(i);
                    var monthKey = (dt.Year, dt.Month);
                    var revenueUSD = monthlyRevenueUSD.ContainsKey(monthKey) ? monthlyRevenueUSD[monthKey] : 0m;
                    
                    series.Add(new MonthlyRevenuePointDTO
                    {
                        Year = dt.Year,
                        Month = dt.Month,
                        Revenue = revenueUSD,
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
