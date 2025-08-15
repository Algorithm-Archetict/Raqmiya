using Shared.DTOs.ProductDTOs;

namespace Core.Interfaces
{
    public interface IEmailService
    {
        Task<bool> SendPasswordChangeNotificationAsync(string email, string username);
        Task<bool> SendWelcomeEmailAsync(string email, string username);
        Task<bool> SendPasswordResetEmailAsync(string email, string resetToken);
        Task<bool> SendEmailAsync(string to, string subject, string body, bool isHtml = true);
        
        // New methods for receipt and creator notifications
        Task<bool> SendReceiptEmailAsync(string customerEmail, string customerName, ReceiptDTO receipt);
        Task<bool> SendCreatorSaleNotificationAsync(string creatorEmail, string creatorName, string productName, string customerName, decimal saleAmount);
    }
}
