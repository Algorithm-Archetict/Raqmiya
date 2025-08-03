using API.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs.AuthDTOs;
using System.Security.Claims;
using System.Security.Cryptography;
using Raqmiya.Infrastructure;

namespace API.Controllers
{
    /// <summary>
    /// Controller for user profile management.
    /// </summary>
    [ApiController]
    [Route(UserRoutes.Users)]
    public class UsersController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly ILogger<UsersController> _logger;

        public UsersController(IUserRepository userRepository, ILogger<UsersController> logger)
        {
            _userRepository = userRepository;
            _logger = logger;
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
                return Ok(MapToProfileDto(user));
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
        [ProducesResponseType(typeof(UserProfileDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> UpdateMe([FromBody] UserUpdateDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var userId = GetCurrentUserId();
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null) return NotFound();
                if (!string.IsNullOrWhiteSpace(dto.Username)) user.Username = dto.Username;
                if (!string.IsNullOrWhiteSpace(dto.ProfileDescription)) user.ProfileDescription = dto.ProfileDescription;
                if (!string.IsNullOrWhiteSpace(dto.ProfileImageUrl)) user.ProfileImageUrl = dto.ProfileImageUrl;
                await _userRepository.UpdateAsync(user);
                return Ok(MapToProfileDto(user));
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
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var userId = GetCurrentUserId();
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null) return NotFound();
                var saltBytes = Convert.FromBase64String(user.Salt);
                using (var pbkdf2 = new Rfc2898DeriveBytes(dto.CurrentPassword, saltBytes, 10000, HashAlgorithmName.SHA256))
                {
                    var hash = Convert.ToBase64String(pbkdf2.GetBytes(32));
                    if (hash != user.HashedPassword)
                        return BadRequest(ErrorMessages.UserCurrentPasswordIncorrect);
                }
                var newSalt = GenerateSalt();
                var newHash = HashPassword(dto.NewPassword, newSalt);
                user.Salt = newSalt;
                user.HashedPassword = newHash;
                await _userRepository.UpdateAsync(user);
                return Ok("Password changed successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return Problem("An error occurred while changing the password.");
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

        private static UserProfileDTO MapToProfileDto(User user) => new UserProfileDTO
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,
            ProfileDescription = user.ProfileDescription,
            ProfileImageUrl = user.ProfileImageUrl,
            CreatedAt = user.CreatedAt,
            IsActive = user.IsActive
        };

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
