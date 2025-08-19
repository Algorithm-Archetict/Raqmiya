using System;
using System.Collections.Generic;
using Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Raqmiya.Infrastructure;
using Shared.DTOs;

namespace Core.Services
{
    public class PlatformAnalyticsService : IPlatformAnalyticsService
    {
        private readonly RaqmiyaDbContext _context;
        private readonly ICurrencyService _currencyService;
        private readonly ILogger<PlatformAnalyticsService> _logger;

        public PlatformAnalyticsService(RaqmiyaDbContext context, ICurrencyService currencyService, ILogger<PlatformAnalyticsService> logger)
        {
            _context = context;
            _currencyService = currencyService;
            _logger = logger;
        }

        public async Task<PlatformRevenueSummaryDTO> GetSummaryAsync(string currency = "USD")
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1);
            var weekStart = now.AddDays(-(int)now.DayOfWeek);

            var all = await _context.PlatformCommissions.ToListAsync();
            var totalUsd = all.Sum(c => c.CommissionUsd);
            var monthlyUsd = all.Where(c => c.CreatedAt >= monthStart).Sum(c => c.CommissionUsd);
            var weeklyUsd = all.Where(c => c.CreatedAt >= weekStart).Sum(c => c.CommissionUsd);

            var total = currency == "USD" ? totalUsd : await _currencyService.ConvertCurrencyAsync(totalUsd, "USD", currency);
            var monthly = currency == "USD" ? monthlyUsd : await _currencyService.ConvertCurrencyAsync(monthlyUsd, "USD", currency);
            var weekly = currency == "USD" ? weeklyUsd : await _currencyService.ConvertCurrencyAsync(weeklyUsd, "USD", currency);

            return new PlatformRevenueSummaryDTO
            {
                TotalCommission = total,
                MonthlyCommission = monthly,
                WeeklyCommission = weekly,
                Currency = currency,
                LastUpdated = now
            };
        }

        public async Task<List<MonthlyRevenuePointDTO>> GetMonthlySeriesAsync(string currency = "USD")
        {
            var points = await _context.PlatformCommissions
                .GroupBy(c => new { c.CreatedAt.Year, c.CreatedAt.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, SumUsd = g.Sum(x => x.CommissionUsd) })
                .OrderBy(g => g.Year).ThenBy(g => g.Month)
                .ToListAsync();

            var list = new List<MonthlyRevenuePointDTO>();
            foreach (var p in points)
            {
                var amount = currency == "USD" ? p.SumUsd : await _currencyService.ConvertCurrencyAsync(p.SumUsd, "USD", currency);
                list.Add(new MonthlyRevenuePointDTO { Year = p.Year, Month = p.Month, Revenue = amount, Currency = currency });
            }
            return list;
        }

        public async Task<List<TopEntityDTO>> GetTopCreatorsAsync(int count = 10, string currency = "USD")
        {
            var rows = await _context.PlatformCommissions
                .GroupBy(c => c.CreatorId)
                .Select(g => new { CreatorId = g.Key, SumUsd = g.Sum(x => x.CommissionUsd) })
                .OrderByDescending(x => x.SumUsd)
                .Take(count)
                .ToListAsync();

            var list = new List<TopEntityDTO>();
            foreach (var r in rows)
            {
                var amount = currency == "USD" ? r.SumUsd : await _currencyService.ConvertCurrencyAsync(r.SumUsd, "USD", currency);
                list.Add(new TopEntityDTO { Id = r.CreatorId, Name = $"Creator #{r.CreatorId}", Amount = amount, Currency = currency });
            }
            return list;
        }

        public async Task<List<TopEntityDTO>> GetTopProductsAsync(int count = 10, string currency = "USD")
        {
            var rows = await _context.PlatformCommissions
                .GroupBy(c => c.ProductId)
                .Select(g => new { ProductId = g.Key, SumUsd = g.Sum(x => x.CommissionUsd) })
                .OrderByDescending(x => x.SumUsd)
                .Take(count)
                .ToListAsync();

            var list = new List<TopEntityDTO>();
            foreach (var r in rows)
            {
                var amount = currency == "USD" ? r.SumUsd : await _currencyService.ConvertCurrencyAsync(r.SumUsd, "USD", currency);
                list.Add(new TopEntityDTO { Id = r.ProductId, Name = $"Product #{r.ProductId}", Amount = amount, Currency = currency });
            }
            return list;
        }
    }
}


