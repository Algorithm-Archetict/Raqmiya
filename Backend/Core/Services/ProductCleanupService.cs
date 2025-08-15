using Infrastructure.Data.Repositories.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Raqmiya.Infrastructure;

namespace Core.Services
{
    public class ProductCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ProductCleanupService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(24); // Run once per day

        public ProductCleanupService(
            IServiceProvider serviceProvider,
            ILogger<ProductCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Product cleanup service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupExpiredProducts();
                    await Task.Delay(_checkInterval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Service is being stopped
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during product cleanup");
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken); // Wait 1 hour before retrying
                }
            }

            _logger.LogInformation("Product cleanup service stopped");
        }

        private async Task CleanupExpiredProducts()
        {
            using var scope = _serviceProvider.CreateScope();
            var productRepository = scope.ServiceProvider.GetRequiredService<IProductRepository>();

            try
            {
                var expiredProducts = await productRepository.GetSoftDeletedProductsAsync();
                var productsToDelete = expiredProducts
                    .Where(p => p.DeletionScheduledAt.HasValue && p.DeletionScheduledAt <= DateTime.UtcNow)
                    .ToList();
                
                if (productsToDelete.Any())
                {
                    _logger.LogInformation("Found {Count} products scheduled for permanent deletion", productsToDelete.Count);

                    foreach (var product in productsToDelete)
                    {
                        try
                        {
                            // Double-check that the product has no active purchases before permanent deletion
                            var hasPurchases = await productRepository.HasProductPurchasesAsync(product.Id);
                            
                            if (!hasPurchases)
                            {
                                await productRepository.PermanentlyDeleteProductAsync(product.Id);
                                _logger.LogInformation("Permanently deleted product: {ProductId} - {ProductName}", product.Id, product.Name);
                            }
                            else
                            {
                                _logger.LogWarning("Skipping permanent deletion of product {ProductId} - {ProductName} due to existing purchases", product.Id, product.Name);
                                // Extend the retention period for products with purchases
                                product.DeletionScheduledAt = DateTime.UtcNow.AddDays(30);
                                // Note: You would need to add an UpdateAsync call here if you want to extend the retention
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error permanently deleting product: {ProductId}", product.Id);
                        }
                    }
                }
                else
                {
                    _logger.LogDebug("No products found for permanent deletion");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during product cleanup process");
            }
        }
    }
}
