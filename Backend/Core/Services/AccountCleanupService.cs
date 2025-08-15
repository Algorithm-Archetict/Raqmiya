using Infrastructure.Data.Repositories.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Core.Services
{
    public class AccountCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AccountCleanupService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(24); // Run once per day

        public AccountCleanupService(
            IServiceProvider serviceProvider,
            ILogger<AccountCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Account cleanup service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupExpiredAccounts();
                    await Task.Delay(_checkInterval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Service is being stopped
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during account cleanup");
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken); // Wait 1 hour before retrying
                }
            }

            _logger.LogInformation("Account cleanup service stopped");
        }

        private async Task CleanupExpiredAccounts()
        {
            using var scope = _serviceProvider.CreateScope();
            var accountDeletionRepository = scope.ServiceProvider.GetRequiredService<IAccountDeletionRepository>();

            try
            {
                var expiredUsers = await accountDeletionRepository.GetUsersScheduledForPermanentDeletionAsync();
                
                if (expiredUsers.Any())
                {
                    _logger.LogInformation("Found {Count} accounts scheduled for permanent deletion", expiredUsers.Count);

                    foreach (var user in expiredUsers)
                    {
                        try
                        {
                            await accountDeletionRepository.PermanentlyDeleteUserAsync(user.Id);
                            _logger.LogInformation("Permanently deleted user account: {UserId}", user.Id);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error permanently deleting user account: {UserId}", user.Id);
                        }
                    }
                }
                else
                {
                    _logger.LogDebug("No accounts found for permanent deletion");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during account cleanup process");
            }
        }
    }
}
