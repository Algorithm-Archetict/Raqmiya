namespace Core.Interfaces
{
    public interface ICurrencyService
    {
        Task<decimal> ConvertCurrencyAsync(decimal amount, string fromCurrency, string toCurrency);
        Task<decimal> GetExchangeRateAsync(string fromCurrency, string toCurrency);
        Task<List<string>> GetSupportedCurrenciesAsync();
        Task<decimal> GetCurrentExchangeRateAsync(string fromCurrency, string toCurrency);
    }
}

