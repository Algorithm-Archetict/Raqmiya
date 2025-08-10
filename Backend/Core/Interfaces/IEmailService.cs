namespace Core.Interfaces
{
    public interface IEmailService
    {
        Task<bool> SendPasswordChangeNotificationAsync(string email, string username);
        Task<bool> SendWelcomeEmailAsync(string email, string username);
        Task<bool> SendPasswordResetEmailAsync(string email, string resetToken);
        Task<bool> SendEmailAsync(string to, string subject, string body, bool isHtml = true);
    }
}
