using API.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs.AuthDTOs;
using System.Security.Claims;
using System.Security.Cryptography;
using Raqmiya.Infrastructure;
using AutoMapper;
using Core.Interfaces;

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

        public UsersController(
            IUserRepository userRepository, 
            ILogger<UsersController> logger, 
            IMapper mapper,
            IEmailService emailService,
            IWebHostEnvironment environment)
        {
            _userRepository = userRepository;
            _logger = logger;
            _mapper = mapper;
            _emailService = emailService;
            _environment = environment;
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
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null) return NotFound();
                
                var userProfile = _mapper.Map<UserProfileDTO>(user);
                
                // Convert relative image URL to full URL if it exists
                if (!string.IsNullOrEmpty(userProfile.ProfileImageUrl) && !userProfile.ProfileImageUrl.StartsWith("http"))
                {
                    var request = HttpContext.Request;
                    var baseUrl = $"{request.Scheme}://{request.Host}";
                    userProfile.ProfileImageUrl = $"{baseUrl}{userProfile.ProfileImageUrl}";
                }
                
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
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null) return NotFound();

                // Update user properties
                if (!string.IsNullOrWhiteSpace(dto.Username)) user.Username = dto.Username;
                if (!string.IsNullOrWhiteSpace(dto.ProfileDescription)) user.ProfileDescription = dto.ProfileDescription;
                if (!string.IsNullOrWhiteSpace(dto.ProfileImageUrl)) user.ProfileImageUrl = dto.ProfileImageUrl;

                await _userRepository.UpdateAsync(user);

                var userProfile = _mapper.Map<UserProfileDTO>(user);
                
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
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null) return NotFound();

                // Verify current password
                var saltBytes = Convert.FromBase64String(user.Salt);
                using (var pbkdf2 = new Rfc2898DeriveBytes(dto.CurrentPassword, saltBytes, 10000, HashAlgorithmName.SHA256))
                {
                    var hash = Convert.ToBase64String(pbkdf2.GetBytes(32));
                    if (hash != user.HashedPassword)
                    {
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
                if (image == null || image.Length == 0)
                {
                    var errorResponse = new UploadImageResponseDTO
                    {
                        Success = false,
                        Message = "No image file provided"
                    };
                    return BadRequest(errorResponse);
                }

                // Validate file size (max 5MB)
                if (image.Length > 5 * 1024 * 1024)
                {
                    var errorResponse = new UploadImageResponseDTO
                    {
                        Success = false,
                        Message = "File size must be less than 5MB"
                    };
                    return BadRequest(errorResponse);
                }

                // Validate file type
                var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif" };
                if (!allowedTypes.Contains(image.ContentType.ToLower()))
                {
                    var errorResponse = new UploadImageResponseDTO
                    {
                        Success = false,
                        Message = "Invalid file type. Please upload a JPG, PNG, or GIF image"
                    };
                    return BadRequest(errorResponse);
                }

                var userId = GetCurrentUserId();
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null) return NotFound();

                // Create uploads directory if it doesn't exist
                var uploadsPath = Path.Combine(_environment.WebRootPath, "uploads", "profile-images");
                if (!Directory.Exists(uploadsPath))
                {
                    Directory.CreateDirectory(uploadsPath);
                }

                // Generate unique filename
                var fileExtension = Path.GetExtension(image.FileName);
                var fileName = $"{userId}_{DateTime.UtcNow:yyyyMMddHHmmss}{fileExtension}";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Save file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(stream);
                }

                // Update user profile with new image URL
                var imageUrl = $"/uploads/profile-images/{fileName}";
                user.ProfileImageUrl = imageUrl;
                await _userRepository.UpdateAsync(user);

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
                var errorResponse = new UploadImageResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while uploading the image"
                };
                return Problem("An error occurred while uploading the image.");
            }
        }

        /// <summary>
        /// Extracts the current user's ID from the JWT claims.
        /// </summary>
        /// <returns>The current user's ID.</returns>
        /// <exception cref="UnauthorizedAccessException">Thrown when the User ID is not found or is not a valid integer.</exception>
        protected int GetCurrentUserId()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                throw new UnauthorizedAccessException("User ID claim missing or invalid.");
            return userId;
        }

        private static string GenerateSalt()
        {
            byte[] saltBytes = new byte[16];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(saltBytes);
            }
            return Convert.ToBase64String(saltBytes);
        }

        private static string HashPassword(string password, string salt)
        {
            var saltBytes = Convert.FromBase64String(salt);
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, saltBytes, 10000, HashAlgorithmName.SHA256))
            {
                byte[] hash = pbkdf2.GetBytes(32);
                return Convert.ToBase64String(hash);
            }
        }
    }
}
