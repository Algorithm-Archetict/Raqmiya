namespace Shared.DTOs
{
    public class CreatorRevenueAnalyticsDTO
    {
        public int TotalSales { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal MonthlyRevenue { get; set; }
        public decimal WeeklyRevenue { get; set; }
        public decimal AverageOrderValue { get; set; }
        public string Currency { get; set; } = "USD";
        public List<TopProductDTO> TopProducts { get; set; } = new List<TopProductDTO>();
        public DateTime LastUpdated { get; set; }
    }

    public class TopProductDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Sales { get; set; }
        public decimal Revenue { get; set; }
        public string Currency { get; set; } = "USD";
    }

    public class CurrencyConversionDTO
    {
        public decimal Amount { get; set; }
        public string FromCurrency { get; set; } = string.Empty;
        public string ToCurrency { get; set; } = string.Empty;
        public decimal ConvertedAmount { get; set; }
        public decimal ExchangeRate { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class MonthlyRevenuePointDTO
    {
        public int Year { get; set; }
        public int Month { get; set; } // 1-12
        public decimal Revenue { get; set; }
        public string Currency { get; set; } = "USD";
    }

    public class PlatformRevenueSummaryDTO
    {
        public decimal TotalCommission { get; set; }
        public decimal MonthlyCommission { get; set; }
        public decimal WeeklyCommission { get; set; }
        public string Currency { get; set; } = "USD";
        public DateTime LastUpdated { get; set; }
    }

    public class TopEntityDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
    }
}

