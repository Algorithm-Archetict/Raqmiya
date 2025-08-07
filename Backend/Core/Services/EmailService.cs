using Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Mail;
using System.Net;
using System.Text;

namespace Core.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;
        private readonly string _fromEmail;
        private readonly string _fromName;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
            _smtpServer = _configuration["Email:SmtpServer"] ?? "smtp.gmail.com";
            _smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            _smtpUsername = _configuration["Email:Username"] ?? "";
            _smtpPassword = _configuration["Email:Password"] ?? "";
            _fromEmail = _configuration["Email:FromEmail"] ?? "";
            _fromName = _configuration["Email:FromName"] ?? "Raqmiya";
        }

        public async Task<bool> SendPasswordChangeNotificationAsync(string email, string username)
        {
            var subject = "Password Changed Successfully - Raqmiya";
            var body = GeneratePasswordChangeEmailBody(username);
            return await SendEmailAsync(email, subject, body);
        }

        public async Task<bool> SendWelcomeEmailAsync(string email, string username)
        {
            var subject = "Welcome to Raqmiya!";
            var body = GenerateWelcomeEmailBody(username);
            return await SendEmailAsync(email, subject, body);
        }

        public async Task<bool> SendPasswordResetEmailAsync(string email, string resetToken)
        {
            var subject = "Password Reset Request - Raqmiya";
            var body = GeneratePasswordResetEmailBody(resetToken);
            return await SendEmailAsync(email, subject, body);
        }

        public async Task<bool> SendEmailAsync(string to, string subject, string body, bool isHtml = true)
        {
            // Check if email configuration is properly set up
            if (string.IsNullOrEmpty(_smtpUsername) || string.IsNullOrEmpty(_smtpPassword))
            {
                _logger.LogWarning("Email service not configured. Skipping email send to {Email}. Configure Email:Username and Email:Password in appsettings.json", to);
                return true; // Return true to avoid breaking the application flow
            }

            try
            {
                using var client = new SmtpClient(_smtpServer, _smtpPort)
                {
                    EnableSsl = true,
                    Credentials = new NetworkCredential(_smtpUsername, _smtpPassword)
                };

                var message = new MailMessage
                {
                    From = new MailAddress(_fromEmail, _fromName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = isHtml
                };
                message.To.Add(to);

                await client.SendMailAsync(message);
                _logger.LogInformation($"Email sent successfully to {to}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {to}");
                return false;
            }
        }

        private string GeneratePasswordChangeEmailBody(string username)
        {
            var html = new StringBuilder();
            html.AppendLine("<!DOCTYPE html>");
            html.AppendLine("<html>");
            html.AppendLine("<head>");
            html.AppendLine("<meta charset='utf-8'>");
            html.AppendLine("<title>Password Changed</title>");
            html.AppendLine("<style>");
            html.AppendLine("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }");
            html.AppendLine(".container { max-width: 600px; margin: 0 auto; padding: 20px; }");
            html.AppendLine(".header { background-color: #007bff; color: white; padding: 20px; text-align: center; }");
            html.AppendLine(".content { padding: 20px; background-color: #f8f9fa; }");
            html.AppendLine(".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }");
            html.AppendLine("</style>");
            html.AppendLine("</head>");
            html.AppendLine("<body>");
            html.AppendLine("<div class='container'>");
            html.AppendLine("<div class='header'>");
            html.AppendLine("<h1>Password Changed Successfully</h1>");
            html.AppendLine("</div>");
            html.AppendLine("<div class='content'>");
            html.AppendLine($"<p>Hello {username},</p>");
            html.AppendLine("<p>Your password has been successfully changed on your Raqmiya account.</p>");
            html.AppendLine("<p>If you did not make this change, please contact our support team immediately.</p>");
            html.AppendLine("<p>Best regards,<br>The Raqmiya Team</p>");
            html.AppendLine("</div>");
            html.AppendLine("<div class='footer'>");
            html.AppendLine("<p>This is an automated message. Please do not reply to this email.</p>");
            html.AppendLine("</div>");
            html.AppendLine("</div>");
            html.AppendLine("</body>");
            html.AppendLine("</html>");

            return html.ToString();
        }

        private string GenerateWelcomeEmailBody(string username)
        {
            var html = new StringBuilder();
            html.AppendLine("<!DOCTYPE html>");
            html.AppendLine("<html>");
            html.AppendLine("<head>");
            html.AppendLine("<meta charset='utf-8'>");
            html.AppendLine("<title>Welcome to Raqmiya</title>");
            html.AppendLine("<style>");
            html.AppendLine("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }");
            html.AppendLine(".container { max-width: 600px; margin: 0 auto; padding: 20px; }");
            html.AppendLine(".header { background-color: #28a745; color: white; padding: 20px; text-align: center; }");
            html.AppendLine(".content { padding: 20px; background-color: #f8f9fa; }");
            html.AppendLine(".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }");
            html.AppendLine("</style>");
            html.AppendLine("</head>");
            html.AppendLine("<body>");
            html.AppendLine("<div class='container'>");
            html.AppendLine("<div class='header'>");
            html.AppendLine("<h1>Welcome to Raqmiya!</h1>");
            html.AppendLine("</div>");
            html.AppendLine("<div class='content'>");
            html.AppendLine($"<p>Hello {username},</p>");
            html.AppendLine("<p>Welcome to Raqmiya! We're excited to have you join our community of digital creators and buyers.</p>");
            html.AppendLine("<p>You can now:</p>");
            html.AppendLine("<ul>");
            html.AppendLine("<li>Browse and purchase digital products</li>");
            html.AppendLine("<li>Create and sell your own digital content</li>");
            html.AppendLine("<li>Connect with other creators</li>");
            html.AppendLine("</ul>");
            html.AppendLine("<p>Best regards,<br>The Raqmiya Team</p>");
            html.AppendLine("</div>");
            html.AppendLine("<div class='footer'>");
            html.AppendLine("<p>This is an automated message. Please do not reply to this email.</p>");
            html.AppendLine("</div>");
            html.AppendLine("</div>");
            html.AppendLine("</body>");
            html.AppendLine("</html>");

            return html.ToString();
        }

        private string GeneratePasswordResetEmailBody(string resetToken)
        {
            var resetUrl = $"{_configuration["AppUrl"]}/reset-password?token={resetToken}";
            
            var html = new StringBuilder();
            html.AppendLine("<!DOCTYPE html>");
            html.AppendLine("<html>");
            html.AppendLine("<head>");
            html.AppendLine("<meta charset='utf-8'>");
            html.AppendLine("<title>Password Reset</title>");
            html.AppendLine("<style>");
            html.AppendLine("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }");
            html.AppendLine(".container { max-width: 600px; margin: 0 auto; padding: 20px; }");
            html.AppendLine(".header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }");
            html.AppendLine(".content { padding: 20px; background-color: #f8f9fa; }");
            html.AppendLine(".button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; }");
            html.AppendLine(".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }");
            html.AppendLine("</style>");
            html.AppendLine("</head>");
            html.AppendLine("<body>");
            html.AppendLine("<div class='container'>");
            html.AppendLine("<div class='header'>");
            html.AppendLine("<h1>Password Reset Request</h1>");
            html.AppendLine("</div>");
            html.AppendLine("<div class='content'>");
            html.AppendLine("<p>You have requested to reset your password on Raqmiya.</p>");
            html.AppendLine("<p>Click the button below to reset your password:</p>");
            html.AppendLine($"<p><a href='{resetUrl}' class='button'>Reset Password</a></p>");
            html.AppendLine("<p>If you did not request this reset, please ignore this email.</p>");
            html.AppendLine("<p>Best regards,<br>The Raqmiya Team</p>");
            html.AppendLine("</div>");
            html.AppendLine("<div class='footer'>");
            html.AppendLine("<p>This is an automated message. Please do not reply to this email.</p>");
            html.AppendLine("</div>");
            html.AppendLine("</div>");
            html.AppendLine("</body>");
            html.AppendLine("</html>");

            return html.ToString();
        }
    }
}
