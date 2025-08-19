using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Security.Cryptography;
using AutoMapper;
using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs.AuthDTOs;
using Shared.DTOs.ProductDTOs;
using API.Constants;
using API.Services;
using Raqmiya.Infrastructure;
// ...existing code...

namespace API.Controllers
{
    /// <summary>
    /// Controller for user profile management.
    /// </summary>
    [ApiController]
    [Route("api/users")]
    public class UsersController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly ILogger<UsersController> _logger;
        private readonly IMapper _mapper;
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _environment;
        private readonly API.Services.FileModerationService _fileModerationService;


        // Helper method to get current user ID from claims
        protected int GetCurrentUserId()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                throw new UnauthorizedAccessException("User ID claim missing or invalid.");
            return userId;
        }

        // Helper method to generate salt
        private static string GenerateSalt()
        {
            byte[] saltBytes = new byte[16];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(saltBytes);
            }
            return Convert.ToBase64String(saltBytes);
        }

        // Helper method to hash password
        private static string HashPassword(string password, string salt)
        {
            var saltBytes = Convert.FromBase64String(salt);
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, saltBytes, 10000, HashAlgorithmName.SHA256))
            {
                byte[] hash = pbkdf2.GetBytes(32);
                return Convert.ToBase64String(hash);
            }
        }

        public UsersController(
            IUserRepository userRepository,
            ILogger<UsersController> logger,
            IMapper mapper,
            IEmailService emailService,
            IWebHostEnvironment environment,
            API.Services.FileModerationService fileModerationService)
        {
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _environment = environment ?? throw new ArgumentNullException(nameof(environment));
            _fileModerationService = fileModerationService ?? throw new ArgumentNullException(nameof(fileModerationService));
        }

        /// <summary>
        /// Get minimal public profile for a user by ID. Used by chat peer display.
        /// </summary>
        [HttpGet("{id:int}")]
        [Authorize]
        public async Task<ActionResult<object>> GetById(int id)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(id);
                if (user == null) return NotFound();

                var request = HttpContext.Request;
                var baseUrl = $"{request.Scheme}://{request.Host}";
                var profileImageUrl = !string.IsNullOrEmpty(user.ProfileImageUrl) && !user.ProfileImageUrl.StartsWith("http")
                    ? baseUrl + user.ProfileImageUrl
                    : user.ProfileImageUrl;

                return Ok(new { id = user.Id, username = user.Username, profileImageUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user by id {Id}", id);
                return Problem("An error occurred while retrieving the user.");
            }
        }

        /// <summary>
        /// Public endpoint to search creators (by username). Returns minimal info.
        /// </summary>
        /// <param name="query">Optional search term (case-insensitive, matches username contains)</param>
        /// <param name="take">Max results to return (default 50)</param>
        /// <param name="skip">Number of results to skip for paging</param>
        [HttpGet("creators")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<object>>> SearchCreators([FromQuery] string? query = null, [FromQuery] int take = 50, [FromQuery] int skip = 0)
        {
            try
            {
                take = Math.Clamp(take, 1, 200);
                skip = Math.Max(skip, 0);

                var creators = await _userRepository.SearchCreatorsAsync(query, take, skip);

                var request = HttpContext.Request;
                var baseUrl = $"{request.Scheme}://{request.Host}";

                var result = creators.Select(u => new
                {
                    id = u.Id,
                    username = u.Username,
                    profileImageUrl = !string.IsNullOrEmpty(u.ProfileImageUrl) && !u.ProfileImageUrl.StartsWith("http")
                        ? baseUrl + u.ProfileImageUrl
                        : u.ProfileImageUrl
                });
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching creators");
                return Problem("An error occurred while searching creators.");
            }
        }

        /// <summary>
        /// Get the current authenticated user's profile.
        /// </summary>
        [HttpGet("me")]
        [Authorize]
        [ProducesResponseType(typeof(UserProfileDTO), 200)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<UserProfileDTO>> GetMe()
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("User {UserId} requesting their profile data", userId);

                // Debug: Log all claims for security monitoring
                var claims = User.Claims.Select(c => $"{c.Type}: {c.Value}").ToList();
                _logger.LogInformation("User claims: {Claims}", string.Join(", ", claims));

                // Additional security validation - ensure user exists and is active
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User {UserId} not found in database - potential security issue", userId);
                    return NotFound("User not found");
                }

                // Validate user is active
                if (!user.IsActive)
                {
                    _logger.LogWarning("Inactive user {UserId} attempting to access profile", userId);
                    return Unauthorized("Account is inactive");
                }

                // Validate that the JWT claims match the database user
                var jwtUsername = User.FindFirstValue(ClaimTypes.Name);
                var jwtEmail = User.FindFirstValue(ClaimTypes.Email);

                if (jwtUsername != user.Username || jwtEmail != user.Email)
                {
                    _logger.LogError("JWT claims mismatch for user {UserId}. JWT Username: {JwtUsername}, DB Username: {DbUsername}",
                        userId, jwtUsername, user.Username);
                    return Unauthorized("Token validation failed");
                }

                var userProfile = _mapper.Map<UserProfileDTO>(user);

                // Convert relative image URL to full URL if it exists
                if (!string.IsNullOrEmpty(userProfile.ProfileImageUrl) && !userProfile.ProfileImageUrl.StartsWith("http"))
                {
                    var request = HttpContext.Request;
                    var baseUrl = $"{request.Scheme}://{request.Host}";
                    userProfile.ProfileImageUrl = $"{baseUrl}{userProfile.ProfileImageUrl}";
                }

                _logger.LogInformation("Successfully retrieved profile data for user {UserId} ({Username})", userId, user.Username);
                return Ok(userProfile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, LogMessages.UserGetProfileError);
                return Problem(ErrorMessages.UserGetProfile);
            }
        }

        /// <summary>
        /// Update the current authenticated user's profile.
        /// </summary>
        [HttpPut("me")]
        [Authorize]
        [ProducesResponseType(typeof(UserProfileUpdateResponseDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<UserProfileUpdateResponseDTO>> UpdateMe([FromBody] UserUpdateDTO dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("User {UserId} attempting to update their profile", userId);

                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User {UserId} not found in database during profile update", userId);
                    return NotFound("User not found");
                }

                // Validate user is active
                if (!user.IsActive)
                {
                    _logger.LogWarning("Inactive user {UserId} attempting to update profile", userId);
                    return Unauthorized("Account is inactive");
                }

                // Validate that the JWT claims match the database user
                var jwtUsername = User.FindFirstValue(ClaimTypes.Name);
                var jwtEmail = User.FindFirstValue(ClaimTypes.Email);

                if (jwtUsername != user.Username || jwtEmail != user.Email)
                {
                    _logger.LogError("JWT claims mismatch during profile update for user {UserId}", userId);
                    return Unauthorized("Token validation failed");
                }

                // Update user properties with validation
                if (!string.IsNullOrWhiteSpace(dto.Username))
                {
                    // Check if username is already taken by another user
                    var existingUser = await _userRepository.GetUserByUsernameAsync(dto.Username);
                    if (existingUser != null && existingUser.Id != userId)
                    {
                        _logger.LogWarning("User {UserId} attempted to use username already taken by user {ExistingUserId}",
                            userId, existingUser.Id);
                        return BadRequest("Username is already taken");
                    }
                    user.Username = dto.Username;
                }

                // Handle ProfileDescription: update if not null, but allow empty string to clear it
                if (dto.ProfileDescription != null)
                    user.ProfileDescription = string.IsNullOrWhiteSpace(dto.ProfileDescription) ? null : dto.ProfileDescription;

                // Handle ProfileImageUrl: update if not null, allow empty string to remove image
                if (dto.ProfileImageUrl != null)
                {
                    // If empty string, set to null to remove image
                    if (string.IsNullOrWhiteSpace(dto.ProfileImageUrl))
                    {
                        user.ProfileImageUrl = null;
                        _logger.LogInformation("Profile image removed for user {UserId}", userId);
                    }
                    else
                    {
                        // Validate URL format if not empty
                        if (!Uri.TryCreate(dto.ProfileImageUrl, UriKind.Absolute, out _) &&
                            !dto.ProfileImageUrl.StartsWith("/"))
                        {
                            _logger.LogWarning("Invalid ProfileImageUrl format for user {UserId}: {Url}", userId, dto.ProfileImageUrl);
                            return BadRequest("Invalid ProfileImageUrl format");
                        }
                        user.ProfileImageUrl = dto.ProfileImageUrl;
                        _logger.LogInformation("Profile image URL updated for user {UserId}: {ImageUrl}", userId, dto.ProfileImageUrl);
                    }
                }

                await _userRepository.UpdateAsync(user);
                _logger.LogInformation("Profile updated successfully for user {UserId} ({Username})", userId, user.Username);
                _logger.LogInformation("User ProfileImageUrl after update: {ProfileImageUrl}", user.ProfileImageUrl ?? "null");

                var userProfile = _mapper.Map<UserProfileDTO>(user);
                _logger.LogInformation("Mapped UserProfileDTO ProfileImageUrl: {ProfileImageUrl}", userProfile.ProfileImageUrl ?? "null");

                // Convert relative image URL to full URL if it exists
                if (!string.IsNullOrEmpty(userProfile.ProfileImageUrl) && !userProfile.ProfileImageUrl.StartsWith("http"))
                {
                    var request = HttpContext.Request;
                    var baseUrl = $"{request.Scheme}://{request.Host}";
                    userProfile.ProfileImageUrl = $"{baseUrl}{userProfile.ProfileImageUrl}";
                }

                var response = new UserProfileUpdateResponseDTO
                {
                    Success = true,
                    Message = "Profile updated successfully",
                    User = userProfile
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, LogMessages.UserUpdateProfileError);
                return Problem(ErrorMessages.UserUpdateProfile);
            }
        }

        /// <summary>
        /// Change the current authenticated user's password.
        /// </summary>
        [HttpPost("me/change-password")]
        [Authorize]
        [ProducesResponseType(typeof(ChangePasswordResponseDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<ChangePasswordResponseDTO>> ChangePassword([FromBody] ChangePasswordDTO dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("User {UserId} attempting to change password", userId);

                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User {UserId} not found in database during password change", userId);
                    return NotFound("User not found");
                }

                // Validate user is active
                if (!user.IsActive)
                {
                    _logger.LogWarning("Inactive user {UserId} attempting to change password", userId);
                    return Unauthorized("Account is inactive");
                }

                // Validate that the JWT claims match the database user
                var jwtUsername = User.FindFirstValue(ClaimTypes.Name);
                var jwtEmail = User.FindFirstValue(ClaimTypes.Email);

                if (jwtUsername != user.Username || jwtEmail != user.Email)
                {
                    _logger.LogError("JWT claims mismatch during password change for user {UserId}", userId);
                    return Unauthorized("Token validation failed");
                }

                // Verify current password
                var saltBytes = Convert.FromBase64String(user.Salt);
                using (var pbkdf2 = new Rfc2898DeriveBytes(dto.CurrentPassword, saltBytes, 10000, HashAlgorithmName.SHA256))
                {
                    var hash = Convert.ToBase64String(pbkdf2.GetBytes(32));
                    if (hash != user.HashedPassword)
                    {
                        _logger.LogWarning("Incorrect current password provided for user {UserId}", userId);
                        var errorResponse = new ChangePasswordResponseDTO
                        {
                            Success = false,
                            Message = "Current password is incorrect"
                        };
                        return BadRequest(errorResponse);
                    }
                }

                // Update password
                var newSalt = GenerateSalt();
                var newHash = HashPassword(dto.NewPassword, newSalt);
                user.Salt = newSalt;
                user.HashedPassword = newHash;

                await _userRepository.UpdateAsync(user);
                _logger.LogInformation("Password changed successfully for user {UserId} ({Username})", userId, user.Username);

                // Send email notification
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _emailService.SendPasswordChangeNotificationAsync(user.Email, user.Username);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send password change notification email");
                    }
                });

                var response = new ChangePasswordResponseDTO
                {
                    Success = true,
                    Message = "Password changed successfully"
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                var errorResponse = new ChangePasswordResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while changing the password"
                };
                return Problem("An error occurred while changing the password.");
            }
        }

        /// <summary>
        /// Upload profile image for the current authenticated user.
        /// </summary>
        [HttpPost("me/upload-image")]
        [Authorize]
        [ProducesResponseType(typeof(UploadImageResponseDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<UploadImageResponseDTO>> UploadProfileImage(IFormFile image)
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("User {UserId} attempting to upload profile image", userId);

                if (image == null || image.Length == 0)
                    return BadRequest(new UploadImageResponseDTO { Success = false, Message = "No image file provided" });

                // Validate file size (max 5MB)
                if (image.Length > 5 * 1024 * 1024)
                    return BadRequest(new UploadImageResponseDTO { Success = false, Message = "File size must be less than 5MB" });

                // Validate file type
                var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif" };
                if (!allowedTypes.Contains(image.ContentType.ToLower()))
                    return BadRequest(new UploadImageResponseDTO { Success = false, Message = "Invalid file type. Please upload a JPG, PNG, or GIF image" });

                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                    return NotFound("User not found");

                // Validate user is active
                if (!user.IsActive)
                    return Unauthorized("Account is inactive");

                // Validate that the JWT claims match the database user
                var jwtUsername = User.FindFirstValue(ClaimTypes.Name);
                var jwtEmail = User.FindFirstValue(ClaimTypes.Email);

                if (jwtUsername != user.Username || jwtEmail != user.Email)
                    return Unauthorized("Token validation failed");

                // Moderate image using Google Vision API
                using (var stream = image.OpenReadStream())
                {
                    bool isSafe = await _fileModerationService.IsImageSafeAsync(stream);
                    if (!isSafe)
                        return BadRequest(new UploadImageResponseDTO { Success = false, Message = "Sensitive or inappropriate content detected." });
                }

                // Create uploads directory if it doesn't exist
                var uploadsPath = Path.Combine(_environment.WebRootPath, "uploads", "profile-images");
                if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);

                // Generate unique filename with user ID to prevent conflicts
                var fileExtension = Path.GetExtension(image.FileName);
                var fileName = $"{userId}_{DateTime.UtcNow:yyyyMMddHHmmss}{fileExtension}";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Save file
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(fileStream);
                }

                // Update user profile with new image URL
                var imageUrl = $"/uploads/profile-images/{fileName}";
                user.ProfileImageUrl = imageUrl;
                await _userRepository.UpdateAsync(user);

                _logger.LogInformation("Profile image uploaded successfully for user {UserId} ({Username})", userId, user.Username);

                // Get the full URL for the response
                var request = HttpContext.Request;
                var baseUrl = $"{request.Scheme}://{request.Host}";
                var fullImageUrl = $"{baseUrl}{imageUrl}";

                var response = new UploadImageResponseDTO
                {
                    Success = true,
                    Message = "Profile image uploaded successfully",
                    ImageUrl = fullImageUrl
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading profile image");
                return Problem("An error occurred while uploading the image.");
            }
        }
    }
}