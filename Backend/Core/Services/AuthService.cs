using Core.Interfaces;
using Infrastructure.Data.Repositories.Interfaces;
using Infrastructure.Data.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Raqmiya.Infrastructure;
using Shared.DTOs.AuthDTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Core.Services
{
    public class AuthService : IAuthService
    {
        private readonly IAuthRepository _authRepository;
        private readonly IPasswordResetRepository _passwordResetRepository;
        private readonly IEmailVerificationRepository _emailVerificationRepository;
        private readonly IAccountDeletionRepository _accountDeletionRepository;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;
        private static readonly HashSet<string> AllowedRoles = new() { "Admin", "Creator", "Customer" };

        public AuthService(
            IAuthRepository authRepository, 
            IPasswordResetRepository passwordResetRepository,
            IEmailVerificationRepository emailVerificationRepository,
            IAccountDeletionRepository accountDeletionRepository,
            IEmailService emailService,
            IConfiguration configuration, 
            ILogger<AuthService> logger)
        {
            _authRepository = authRepository;
            _passwordResetRepository = passwordResetRepository;
            _emailVerificationRepository = emailVerificationRepository;
            _accountDeletionRepository = accountDeletionRepository;
            _emailService = emailService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<AuthResponseDTO> RegisterAsync(RegisterRequestDTO request)
        {
            try
            {
                if (!AllowedRoles.Contains(request.Role))
                {
                    return new AuthResponseDTO { Success = false, Message = "Invalid role. Allowed roles: Admin, Creator, Customer." };
                }
                if (await _authRepository.UserExistsByEmailAsync(request.Email))
                {
                    return new AuthResponseDTO { Success = false, Message = "Email already registered." };
                }
                if (await _authRepository.UserExistsByUsernameAsync(request.Username))
                {
                    return new AuthResponseDTO { Success = false, Message = "Username already taken." };
                }

                // Check if there's already a pending verification for this email
                var existingVerification = await _emailVerificationRepository.GetByEmailAsync(request.Email);
                if (existingVerification != null)
                {
                    // Delete existing verification token
                    await _emailVerificationRepository.DeleteAsync(existingVerification);
                }

                // Generate verification token
                var verificationToken = Guid.NewGuid().ToString();
                var expiresAt = DateTime.UtcNow.AddMinutes(30); // 30 minutes expiration

                // Store pending user data as JSON
                var pendingUserData = System.Text.Json.JsonSerializer.Serialize(new
                {
                    Username = request.Username,
                    Email = request.Email,
                    Password = request.Password,
                    Role = request.Role
                });

                var emailVerificationToken = new EmailVerificationToken
                {
                    Email = request.Email,
                    Token = verificationToken,
                    ExpiresAt = expiresAt,
                    IsUsed = false,
                    CreatedAt = DateTime.UtcNow,
                    PendingUserData = pendingUserData
                };

                await _emailVerificationRepository.CreateAsync(emailVerificationToken);

                // Send verification email
                var frontendUrl = _configuration["AppUrl"] ?? "http://localhost:4200";
                var verificationLink = $"{frontendUrl}/verify-email?token={verificationToken}";
                
                var emailSubject = "Verify Your Email - Raqmiya";
                var emailBody = $@"
                    <h2>Welcome to Raqmiya!</h2>
                    <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
                    <p><a href='{verificationLink}' style='background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Verify Email</a></p>
                    <p>Or copy and paste this link in your browser: {verificationLink}</p>
                    <p>This link will expire in 30 minutes.</p>
                    <p>If you didn't create an account, please ignore this email.</p>
                    <p>Best regards,<br>The Raqmiya Team</p>";

                await _emailService.SendEmailAsync(request.Email, emailSubject, emailBody);

                _logger.LogInformation("Registration verification email sent to: {Email}", request.Email);

                return new AuthResponseDTO
                {
                    Success = true,
                    Message = "Registration initiated. Please check your email to verify your account.",
                    Email = request.Email
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration");
                return new AuthResponseDTO { Success = false, Message = "An error occurred during registration. Please try again." };
            }
        }

        public async Task<AuthResponseDTO> LoginAsync(LoginRequestDTO request)
        {
            _logger.LogInformation("Login attempt for: {EmailOrUsername}", request.EmailOrUsername);
            
            var user = await _authRepository.GetUserByEmailOrUsernameAsync(request.EmailOrUsername);

            if (user == null)
            {
                _logger.LogWarning("User not found: {EmailOrUsername}", request.EmailOrUsername);
                return new AuthResponseDTO { Success = false, Message = "Invalid credentials." };
            }

            _logger.LogInformation("User found: {Username}, Email: {Email}, IsActive: {IsActive}", 
                user.Username, user.Email, user.IsActive);

            var hashedPasswordAttempt = HashPassword(request.Password, user.Salt);
            _logger.LogInformation("Password comparison - Stored: {StoredHash}, Attempt: {AttemptHash}", 
                user.HashedPassword, hashedPasswordAttempt);

            if (hashedPasswordAttempt != user.HashedPassword)
            {
                _logger.LogWarning("Password mismatch for user: {EmailOrUsername}", request.EmailOrUsername);
                return new AuthResponseDTO { Success = false, Message = "Invalid credentials." };
            }

            if (!user.IsActive)
            {
                _logger.LogWarning("Inactive account for user: {EmailOrUsername}", request.EmailOrUsername);
                
                // Check if account is soft deleted and provide restoration guidance
                if (user.IsDeleted)
                {
                    var daysUntilPermanentDeletion = user.DeletionScheduledAt.HasValue 
                        ? (user.DeletionScheduledAt.Value - DateTime.UtcNow).Days 
                        : 30;
                    
                    var message = $"Your account has been deactivated. ";
                    if (daysUntilPermanentDeletion > 0)
                    {
                        message += $"You can restore it within {daysUntilPermanentDeletion} days. Please check your email for a restoration link or contact support.";
                    }
                    else
                    {
                        message += "The restoration period has expired. Please contact support for assistance.";
                    }
                    
                    return new AuthResponseDTO { Success = false, Message = message };
                }
                else
                {
                    return new AuthResponseDTO { Success = false, Message = "Account is inactive. Please contact support for assistance." };
                }
            }

            var token = GenerateJwtToken(user);
            _logger.LogInformation("Login successful for user: {EmailOrUsername}", request.EmailOrUsername);

            return new AuthResponseDTO
            {
                Success = true,
                Token = token,
                Username = user.Username,
                Email = user.Email,
                Roles = new List<string> { user.Role },
                Message = "Login successful."
            };
        }

        private string GenerateSalt()
        {
            byte[] saltBytes = new byte[16];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(saltBytes);
            }
            return Convert.ToBase64String(saltBytes);
        }

        private string HashPassword(string password, string salt)
        {
            var saltBytes = Convert.FromBase64String(salt);
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, saltBytes, 10000, HashAlgorithmName.SHA256))
            {
                byte[] hash = pbkdf2.GetBytes(32);
                return Convert.ToBase64String(hash);
            }
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var jwtSecret = _configuration["Jwt:Secret"];
            if (string.IsNullOrEmpty(jwtSecret))
            {
                _logger.LogError("JWT Secret is not configured.");
                throw new InvalidOperationException("JWT Secret not configured.");
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expires = DateTime.UtcNow.AddHours(int.Parse(_configuration["Jwt:TokenValidityInHours"] ?? "24"));

            var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: expires,
                signingCredentials: creds
            );

            return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<ForgotPasswordResponseDTO> ForgotPasswordAsync(ForgotPasswordDTO request)
        {
            _logger.LogInformation("Forgot password request for email: {Email}", request.Email);

            try
            {
                // Find user by email
                var user = await _authRepository.GetUserByEmailAsync(request.Email);
                if (user == null)
                {
                    // Don't reveal if email exists or not for security
                    _logger.LogInformation("Forgot password request for non-existent email: {Email}", request.Email);
                    return new ForgotPasswordResponseDTO
                    {
                        Success = true,
                        EmailSent = true,
                        Message = "If the email address exists in our system, you will receive a password reset link shortly."
                    };
                }

                // Check if user is active
                if (!user.IsActive)
                {
                    _logger.LogWarning("Inactive user attempted password reset: {Email}", request.Email);
                    return new ForgotPasswordResponseDTO
                    {
                        Success = true,
                        EmailSent = true,
                        Message = "If the email address exists in our system, you will receive a password reset link shortly."
                    };
                }

                // Delete any existing reset tokens for this user
                var existingToken = await _passwordResetRepository.GetByUserIdAsync(user.Id);
                if (existingToken != null)
                {
                    await _passwordResetRepository.DeleteAsync(existingToken.Id);
                }

                // Generate new reset token
                var resetToken = new PasswordResetToken
                {
                    Token = GenerateSecureToken(),
                    UserId = user.Id,
                    ExpiresAt = DateTime.UtcNow.AddHours(1), // Token expires in 1 hour
                    IsUsed = false
                };

                await _passwordResetRepository.CreateAsync(resetToken);

                // Send reset email
                var emailSent = await _emailService.SendPasswordResetEmailAsync(user.Email, resetToken.Token);
                
                if (emailSent)
                {
                    _logger.LogInformation("Password reset email sent successfully to: {Email}", request.Email);
                    return new ForgotPasswordResponseDTO
                    {
                        Success = true,
                        EmailSent = true,
                        Message = "Password reset link has been sent to your email address."
                    };
                }
                else
                {
                    _logger.LogError("Failed to send password reset email to: {Email}", request.Email);
                    return new ForgotPasswordResponseDTO
                    {
                        Success = false,
                        EmailSent = false,
                        Message = "Failed to send password reset email. Please try again later."
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing forgot password request for email: {Email}", request.Email);
                return new ForgotPasswordResponseDTO
                {
                    Success = false,
                    EmailSent = false,
                    Message = "An error occurred while processing your request. Please try again later."
                };
            }
        }

        public async Task<PasswordResetResponseDTO> ResetPasswordAsync(ResetPasswordDTO request)
        {
            _logger.LogInformation("Password reset attempt with token");

            try
            {
                // Validate token
                var resetToken = await _passwordResetRepository.GetByTokenAsync(request.Token);
                if (resetToken == null)
                {
                    _logger.LogWarning("Invalid reset token used");
                    return new PasswordResetResponseDTO
                    {
                        Success = false,
                        Message = "Invalid or expired reset token."
                    };
                }

                // Check if token is expired
                if (resetToken.ExpiresAt < DateTime.UtcNow)
                {
                    _logger.LogWarning("Expired reset token used");
                    return new PasswordResetResponseDTO
                    {
                        Success = false,
                        Message = "Reset token has expired. Please request a new password reset."
                    };
                }

                // Check if token is already used
                if (resetToken.IsUsed)
                {
                    _logger.LogWarning("Already used reset token attempted");
                    return new PasswordResetResponseDTO
                    {
                        Success = false,
                        Message = "Reset token has already been used. Please request a new password reset."
                    };
                }

                // Get user
                var user = await _authRepository.GetByIdAsync(resetToken.UserId);
                if (user == null)
                {
                    _logger.LogError("User not found for reset token: {TokenId}", resetToken.Id);
                    return new PasswordResetResponseDTO
                    {
                        Success = false,
                        Message = "Invalid reset token."
                    };
                }

                // Update password
                var newSalt = GenerateSalt();
                var newHash = HashPassword(request.NewPassword, newSalt);
                user.Salt = newSalt;
                user.HashedPassword = newHash;

                await _authRepository.UpdateAsync(user);

                // Mark token as used
                resetToken.IsUsed = true;
                await _passwordResetRepository.UpdateAsync(resetToken);

                _logger.LogInformation("Password reset successful for user: {UserId}", user.Id);

                return new PasswordResetResponseDTO
                {
                    Success = true,
                    Message = "Password has been reset successfully. You can now login with your new password."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password");
                return new PasswordResetResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while resetting your password. Please try again later."
                };
            }
        }

        public async Task<VerifyTokenResponseDTO> VerifyResetTokenAsync(string token)
        {
            _logger.LogInformation("Verifying reset token");

            try
            {
                var resetToken = await _passwordResetRepository.GetByTokenAsync(token);
                
                if (resetToken == null)
                {
                    return new VerifyTokenResponseDTO
                    {
                        Success = false,
                        IsValid = false,
                        IsExpired = false,
                        Message = "Invalid reset token."
                    };
                }

                var isExpired = resetToken.ExpiresAt < DateTime.UtcNow;
                var isValid = !isExpired && !resetToken.IsUsed;

                return new VerifyTokenResponseDTO
                {
                    Success = true,
                    IsValid = isValid,
                    IsExpired = isExpired,
                    Message = isValid ? "Token is valid." : (isExpired ? "Token has expired." : "Token has already been used.")
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying reset token");
                return new VerifyTokenResponseDTO
                {
                    Success = false,
                    IsValid = false,
                    IsExpired = false,
                    Message = "An error occurred while verifying the token."
                };
            }
        }

        private string GenerateSecureToken()
        {
            var randomBytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }
            return Convert.ToBase64String(randomBytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "")
                .Substring(0, 32);
        }

        public async Task<AuthResponseDTO> VerifyEmailAsync(EmailVerificationDTO request)
        {
            try
            {
                var verificationToken = await _emailVerificationRepository.GetByTokenAsync(request.Token);
                
                if (verificationToken == null)
                {
                    return new AuthResponseDTO
                    {
                        Success = false,
                        Message = "Invalid verification token."
                    };
                }

                if (verificationToken.IsUsed)
                {
                    return new AuthResponseDTO
                    {
                        Success = false,
                        Message = "This verification link has already been used."
                    };
                }

                if (verificationToken.ExpiresAt < DateTime.UtcNow)
                {
                    return new AuthResponseDTO
                    {
                        Success = false,
                        Message = "This verification link has expired. Please request a new one."
                    };
                }

                // Deserialize pending user data
                var pendingUserData = System.Text.Json.JsonSerializer.Deserialize<PendingUserData>(verificationToken.PendingUserData);
                
                if (pendingUserData == null)
                {
                    return new AuthResponseDTO
                    {
                        Success = false,
                        Message = "Invalid user data. Please try registering again."
                    };
                }

                // Create the user
                var salt = GenerateSalt();
                var hashedPassword = HashPassword(pendingUserData.Password, salt);

                var newUser = new User
                {
                    Username = pendingUserData.Username,
                    Email = pendingUserData.Email,
                    HashedPassword = hashedPassword,
                    Salt = salt,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true,
                    Role = pendingUserData.Role
                };

                await _authRepository.AddAsync(newUser);

                // Mark token as used
                verificationToken.IsUsed = true;
                await _emailVerificationRepository.UpdateAsync(verificationToken);

                // Generate JWT token
                var token = GenerateJwtToken(newUser);

                _logger.LogInformation("Email verification successful for user: {Email}", newUser.Email);

                return new AuthResponseDTO
                {
                    Success = true,
                    Token = token,
                    Username = newUser.Username,
                    Email = newUser.Email,
                    Roles = new List<string> { newUser.Role },
                    Message = "Email verified successfully! Your account has been created."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying email");
                return new AuthResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while verifying your email. Please try again."
                };
            }
        }

        public async Task<ResendVerificationResponseDTO> ResendVerificationAsync(ResendVerificationDTO request)
        {
            try
            {
                var existingVerification = await _emailVerificationRepository.GetByEmailAsync(request.Email);
                
                if (existingVerification == null)
                {
                    return new ResendVerificationResponseDTO
                    {
                        Success = false,
                        Message = "No pending verification found for this email. Please register first.",
                        EmailSent = false
                    };
                }

                // Check if user already exists
                if (await _authRepository.UserExistsByEmailAsync(request.Email))
                {
                    return new ResendVerificationResponseDTO
                    {
                        Success = false,
                        Message = "This email is already registered.",
                        EmailSent = false
                    };
                }

                // Generate new token
                var newToken = Guid.NewGuid().ToString();
                var expiresAt = DateTime.UtcNow.AddMinutes(30);

                existingVerification.Token = newToken;
                existingVerification.ExpiresAt = expiresAt;
                existingVerification.IsUsed = false;
                existingVerification.CreatedAt = DateTime.UtcNow;

                await _emailVerificationRepository.UpdateAsync(existingVerification);

                // Send new verification email
                var frontendUrl = _configuration["AppUrl"] ?? "http://localhost:4200";
                var verificationLink = $"{frontendUrl}/verify-email?token={newToken}";
                
                var emailSubject = "Verify Your Email - Raqmiya";
                var emailBody = $@"
                    <h2>Email Verification - Raqmiya</h2>
                    <p>You requested a new verification email. Please verify your email address by clicking the link below:</p>
                    <p><a href='{verificationLink}' style='background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Verify Email</a></p>
                    <p>Or copy and paste this link in your browser: {verificationLink}</p>
                    <p>This link will expire in 30 minutes.</p>
                    <p>If you didn't request this email, please ignore it.</p>
                    <p>Best regards,<br>The Raqmiya Team</p>";

                await _emailService.SendEmailAsync(request.Email, emailSubject, emailBody);

                _logger.LogInformation("Verification email resent to: {Email}", request.Email);

                return new ResendVerificationResponseDTO
                {
                    Success = true,
                    Message = "Verification email has been sent. Please check your inbox.",
                    EmailSent = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resending verification email");
                return new ResendVerificationResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while sending the verification email. Please try again.",
                    EmailSent = false
                };
            }
        }

        // Account Deletion Methods
        public async Task<RequestAccountDeletionResponseDTO> RequestAccountDeletionAsync(RequestAccountDeletionDTO request, int userId)
        {
            try
            {
                // Get user and verify password
                var user = await _authRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    return new RequestAccountDeletionResponseDTO
                    {
                        Success = false,
                        Message = "User not found.",
                        EmailSent = false
                    };
                }

                // Verify password
                var hashedPassword = HashPassword(request.Password, user.Salt);
                if (hashedPassword != user.HashedPassword)
                {
                    return new RequestAccountDeletionResponseDTO
                    {
                        Success = false,
                        Message = "Invalid password.",
                        EmailSent = false
                    };
                }

                // Check if user is already deleted
                if (user.IsDeleted)
                {
                    return new RequestAccountDeletionResponseDTO
                    {
                        Success = false,
                        Message = "Account is already marked for deletion.",
                        EmailSent = false
                    };
                }

                // Delete any existing deletion tokens for this user
                var existingToken = await _accountDeletionRepository.GetByUserIdAsync(userId);
                if (existingToken != null)
                {
                    await _accountDeletionRepository.DeleteAsync(existingToken);
                }

                // Generate deletion token
                var deletionToken = Guid.NewGuid().ToString();
                var expiresAt = DateTime.UtcNow.AddHours(24); // 24 hours expiration

                // Store deletion data as JSON
                var deletionData = System.Text.Json.JsonSerializer.Serialize(new
                {
                    DeletionReason = request.DeletionReason,
                    ConfirmDeletion = request.ConfirmDeletion
                });

                var accountDeletionToken = new AccountDeletionToken
                {
                    UserId = userId,
                    Token = deletionToken,
                    ExpiresAt = expiresAt,
                    IsUsed = false,
                    CreatedAt = DateTime.UtcNow,
                    DeletionData = deletionData
                };

                await _accountDeletionRepository.CreateAsync(accountDeletionToken);

                // Send confirmation email
                var frontendUrl = _configuration["AppUrl"] ?? "http://localhost:4200";
                var confirmationLink = $"{frontendUrl}/confirm-account-deletion?token={deletionToken}";
                var cancelLink = $"{frontendUrl}/cancel-account-deletion?token={deletionToken}";
                
                var emailSubject = "Confirm Account Deletion - Raqmiya";
                var emailBody = $@"
                    <h2>Account Deletion Confirmation - Raqmiya</h2>
                    <p>You have requested to delete your account. To confirm this action, please click the link below:</p>
                    <p><strong>Reason for deletion:</strong> {request.DeletionReason}</p>
                    <p><a href='{confirmationLink}' style='background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Confirm Deletion</a></p>
                    <p>Or copy and paste this link in your browser: {confirmationLink}</p>
                    <p>If you change your mind, you can cancel the deletion by clicking here:</p>
                    <p><a href='{cancelLink}' style='background-color: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Cancel Deletion</a></p>
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>Your account will be hidden immediately after confirmation</li>
                        <li>You can restore your account within 30 days</li>
                        <li>After 30 days, your account will be permanently deleted</li>
                        <li>This link will expire in 24 hours</li>
                    </ul>
                    <p>If you didn't request this deletion, please ignore this email and consider changing your password.</p>
                    <p>Best regards,<br>The Raqmiya Team</p>";

                await _emailService.SendEmailAsync(user.Email, emailSubject, emailBody);

                _logger.LogInformation("Account deletion request sent for user: {UserId}", userId);

                return new RequestAccountDeletionResponseDTO
                {
                    Success = true,
                    Message = "Account deletion confirmation email has been sent. Please check your inbox.",
                    EmailSent = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error requesting account deletion");
                return new RequestAccountDeletionResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while processing your request. Please try again.",
                    EmailSent = false
                };
            }
        }

        public async Task<ConfirmAccountDeletionResponseDTO> ConfirmAccountDeletionAsync(ConfirmAccountDeletionDTO request)
        {
            try
            {
                var deletionToken = await _accountDeletionRepository.GetByTokenAsync(request.Token);
                
                if (deletionToken == null)
                {
                    return new ConfirmAccountDeletionResponseDTO
                    {
                        Success = false,
                        Message = "Invalid deletion token.",
                        AccountDeleted = false
                    };
                }

                if (deletionToken.IsUsed)
                {
                    return new ConfirmAccountDeletionResponseDTO
                    {
                        Success = false,
                        Message = "This deletion link has already been used.",
                        AccountDeleted = false
                    };
                }

                if (deletionToken.ExpiresAt < DateTime.UtcNow)
                {
                    return new ConfirmAccountDeletionResponseDTO
                    {
                        Success = false,
                        Message = "This deletion link has expired. Please request a new one.",
                        AccountDeleted = false
                    };
                }

                // Deserialize deletion data
                var deletionData = System.Text.Json.JsonSerializer.Deserialize<DeletionData>(deletionToken.DeletionData);
                if (deletionData == null)
                {
                    return new ConfirmAccountDeletionResponseDTO
                    {
                        Success = false,
                        Message = "Invalid deletion data.",
                        AccountDeleted = false
                    };
                }

                // Soft delete the user
                await _accountDeletionRepository.SoftDeleteUserAsync(deletionToken.UserId, deletionData.DeletionReason);

                // Mark token as used
                deletionToken.IsUsed = true;
                await _accountDeletionRepository.UpdateAsync(deletionToken);

                // Get user info for restoration email
                var user = await _authRepository.GetByIdAsync(deletionToken.UserId);
                if (user != null)
                {
                    // Generate restoration token
                    var restorationToken = Guid.NewGuid().ToString();
                    var restorationExpiresAt = DateTime.UtcNow.AddDays(30); // 30 days to restore

                    var restorationTokenEntity = new AccountDeletionToken
                    {
                        UserId = deletionToken.UserId,
                        Token = restorationToken,
                        ExpiresAt = restorationExpiresAt,
                        IsUsed = false,
                        CreatedAt = DateTime.UtcNow,
                        DeletionData = "{\"DeletionReason\":\"Restoration token\",\"ConfirmDeletion\":false}"
                    };

                    await _accountDeletionRepository.CreateAsync(restorationTokenEntity);

                    // Send restoration email
                    var frontendUrl = _configuration["AppUrl"] ?? "http://localhost:4200";
                    var restorationLink = $"{frontendUrl}/restore-account?token={restorationToken}";
                    
                    var emailSubject = "Account Deleted - Restoration Available - Raqmiya";
                    var emailBody = $@"
                        <h2>Account Deleted - Raqmiya</h2>
                        <p>Your account has been successfully deleted as requested.</p>
                        <p><strong>Reason for deletion:</strong> {deletionData.DeletionReason}</p>
                        <p><strong>Important:</strong> You can restore your account within 30 days by clicking the link below:</p>
                        <p><a href='{restorationLink}' style='background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Restore My Account</a></p>
                        <p>Or copy and paste this link in your browser: {restorationLink}</p>
                        <p><strong>Restoration Period:</strong></p>
                        <ul>
                            <li>You have 30 days to restore your account</li>
                            <li>After 30 days, your account will be permanently deleted</li>
                            <li>This restoration link will expire in 30 days</li>
                        </ul>
                        <p>If you don't want to restore your account, you can simply ignore this email.</p>
                        <p>Best regards,<br>The Raqmiya Team</p>";

                    await _emailService.SendEmailAsync(user.Email, emailSubject, emailBody);
                }

                _logger.LogInformation("Account soft deleted for user: {UserId}", deletionToken.UserId);

                return new ConfirmAccountDeletionResponseDTO
                {
                    Success = true,
                    Message = "Your account has been successfully deleted. A restoration link has been sent to your email.",
                    AccountDeleted = true,
                    DeletionScheduledAt = DateTime.UtcNow.AddDays(30)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming account deletion");
                return new ConfirmAccountDeletionResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while deleting your account. Please try again.",
                    AccountDeleted = false
                };
            }
        }

        public async Task<RestoreAccountResponseDTO> RestoreAccountAsync(RestoreAccountDTO request)
        {
            try
            {
                var deletionToken = await _accountDeletionRepository.GetByTokenAsync(request.Token);
                
                if (deletionToken == null)
                {
                    return new RestoreAccountResponseDTO
                    {
                        Success = false,
                        Message = "Invalid restoration token.",
                        AccountRestored = false
                    };
                }

                // Restore the user
                await _accountDeletionRepository.RestoreUserAsync(deletionToken.UserId);

                // Get the restored user
                var user = await _authRepository.GetByIdAsync(deletionToken.UserId);
                if (user == null)
                {
                    return new RestoreAccountResponseDTO
                    {
                        Success = false,
                        Message = "User not found after restoration.",
                        AccountRestored = false
                    };
                }

                // Generate JWT token for automatic login
                var token = GenerateJwtToken(user);

                // Delete the token
                await _accountDeletionRepository.DeleteAsync(deletionToken);

                _logger.LogInformation("Account restored for user: {UserId}", deletionToken.UserId);

                return new RestoreAccountResponseDTO
                {
                    Success = true,
                    Message = "Your account has been successfully restored. You are now logged in.",
                    AccountRestored = true,
                    Token = token,
                    Username = user.Username,
                    Email = user.Email,
                    Roles = new List<string> { user.Role }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring account");
                return new RestoreAccountResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while restoring your account. Please try again.",
                    AccountRestored = false
                };
            }
        }

        public async Task<CancelAccountDeletionResponseDTO> CancelAccountDeletionAsync(CancelAccountDeletionDTO request)
        {
            try
            {
                var deletionToken = await _accountDeletionRepository.GetByTokenAsync(request.Token);
                
                if (deletionToken == null)
                {
                    return new CancelAccountDeletionResponseDTO
                    {
                        Success = false,
                        Message = "Invalid cancellation token.",
                        DeletionCancelled = false
                    };
                }

                // Delete the token
                await _accountDeletionRepository.DeleteAsync(deletionToken);

                _logger.LogInformation("Account deletion cancelled for user: {UserId}", deletionToken.UserId);

                return new CancelAccountDeletionResponseDTO
                {
                    Success = true,
                    Message = "Account deletion has been cancelled.",
                    DeletionCancelled = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling account deletion");
                return new CancelAccountDeletionResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while cancelling the deletion. Please try again.",
                    DeletionCancelled = false
                };
            }
        }
    }

    // Helper class for deserializing pending user data
    public class PendingUserData
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    // Helper class for deserializing deletion data
    public class DeletionData
    {
        public string DeletionReason { get; set; } = string.Empty;
        public bool ConfirmDeletion { get; set; }
    }
}
