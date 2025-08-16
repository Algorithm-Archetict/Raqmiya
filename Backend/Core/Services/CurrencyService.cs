using Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace Core.Services
{
    public class CurrencyService : ICurrencyService
    {
        private readonly ILogger<CurrencyService> _logger;
        
        // Exchange rates (in production, these would come from an external API)
        private readonly Dictionary<string, Dictionary<string, decimal>> _exchangeRates = new()
        {
            ["USD"] = new Dictionary<string, decimal>
            {
                ["EGP"] = 50.0m, // 1 USD = 50 EGP
                ["EUR"] = 0.85m,  // 1 USD = 0.85 EUR
                ["GBP"] = 0.73m   // 1 USD = 0.73 GBP
            },
            ["EGP"] = new Dictionary<string, decimal>
            {
                ["USD"] = 0.02m,  // 1 EGP = 0.02 USD (1/50)
                ["EUR"] = 0.017m, // 1 EGP = 0.017 EUR
                ["GBP"] = 0.0146m // 1 EGP = 0.0146 GBP
            },
            ["EUR"] = new Dictionary<string, decimal>
            {
                ["USD"] = 1.18m,  // 1 EUR = 1.18 USD
                ["EGP"] = 59.0m,  // 1 EUR = 59 EGP
                ["GBP"] = 0.86m   // 1 EUR = 0.86 GBP
            },
            ["GBP"] = new Dictionary<string, decimal>
            {
                ["USD"] = 1.37m,  // 1 GBP = 1.37 USD
                ["EGP"] = 68.5m,  // 1 GBP = 68.5 EGP
                ["EUR"] = 1.16m   // 1 GBP = 1.16 EUR
            }
        };

        private readonly List<string> _supportedCurrencies = new() { "USD", "EGP", "EUR", "GBP" };

        public CurrencyService(ILogger<CurrencyService> logger)
        {
            _logger = logger;
        }

        public async Task<decimal> ConvertCurrencyAsync(decimal amount, string fromCurrency, string toCurrency)
        {
            if (fromCurrency == toCurrency)
                return amount;

            try
            {
                var exchangeRate = await GetExchangeRateAsync(fromCurrency, toCurrency);
                return amount * exchangeRate;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error converting currency from {FromCurrency} to {ToCurrency}", fromCurrency, toCurrency);
                throw;
            }
        }

        public async Task<decimal> GetExchangeRateAsync(string fromCurrency, string toCurrency)
        {
            if (fromCurrency == toCurrency)
                return 1.0m;

            try
            {
                // Check if we have a direct exchange rate
                if (_exchangeRates.ContainsKey(fromCurrency) && 
                    _exchangeRates[fromCurrency].ContainsKey(toCurrency))
                {
                    return _exchangeRates[fromCurrency][toCurrency];
                }

                // Check if we have a reverse exchange rate
                if (_exchangeRates.ContainsKey(toCurrency) && 
                    _exchangeRates[toCurrency].ContainsKey(fromCurrency))
                {
                    return 1.0m / _exchangeRates[toCurrency][fromCurrency];
                }

                // If no direct or reverse rate found, try to find a conversion path
                // For now, we'll use USD as an intermediate currency
                if (fromCurrency != "USD" && toCurrency != "USD")
                {
                    var usdFromRate = await GetExchangeRateAsync(fromCurrency, "USD");
                    var usdToRate = await GetExchangeRateAsync("USD", toCurrency);
                    return usdFromRate * usdToRate;
                }

                _logger.LogWarning("Exchange rate not found for {FromCurrency} to {ToCurrency}", fromCurrency, toCurrency);
                return 1.0m; // Return 1:1 if no rate found
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exchange rate from {FromCurrency} to {ToCurrency}", fromCurrency, toCurrency);
                throw;
            }
        }

        public async Task<List<string>> GetSupportedCurrenciesAsync()
        {
            return await Task.FromResult(_supportedCurrencies);
        }

        public async Task<decimal> GetCurrentExchangeRateAsync(string fromCurrency, string toCurrency)
        {
            return await GetExchangeRateAsync(fromCurrency, toCurrency);
        }
    }
}
