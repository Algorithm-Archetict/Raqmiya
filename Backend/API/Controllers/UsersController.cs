using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Raqmiya.Infrastructure;
using Shared.DTOs.AuthDTOs;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace API.Controllers
{
    /// <summary>
    /// Controller for user profile and admin user management.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
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
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();
            return Ok(MapToProfileDTO(user));
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
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();
            if (!string.IsNullOrWhiteSpace(dto.Username)) user.Username = dto.Username;
            if (!string.IsNullOrWhiteSpace(dto.ProfileDescription)) user.ProfileDescription = dto.ProfileDescription;
            if (!string.IsNullOrWhiteSpace(dto.ProfileImageUrl)) user.ProfileImageUrl = dto.ProfileImageUrl;
            await _userRepository.UpdateAsync(user);
            return Ok(MapToProfileDTO(user));
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
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();

            // Verify current password
            var saltBytes = Convert.FromBase64String(user.Salt);
            using (var pbkdf2 = new Rfc2898DeriveBytes(dto.CurrentPassword, saltBytes, 10000, HashAlgorithmName.SHA256))
            {
                var hash = Convert.ToBase64String(pbkdf2.GetBytes(32));
                if (hash != user.HashedPassword)
                    return BadRequest("Current password is incorrect.");
            }

            // Set new password
            var newSalt = GenerateSalt();
            var newHash = HashPassword(dto.NewPassword, newSalt);
            user.Salt = newSalt;
            user.HashedPassword = newHash;
            await _userRepository.UpdateAsync(user);
            return Ok("Password changed successfully.");
        }

        /// <summary>
        /// List all users (admin only).
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(IEnumerable<UserProfileDTO>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<ActionResult<IEnumerable<UserProfileDTO>>> GetAll()
        {
            var users = await _userRepository.GetAllAsync();
            return Ok(users.Select(MapToProfileDTO));
        }

        /// <summary>
        /// Get a user by id (admin only).
        /// </summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(UserProfileDTO), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<UserProfileDTO>> GetById(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(MapToProfileDTO(user));
        }

        /// <summary>
        /// Deactivate a user account (admin only).
        /// </summary>
        [HttpPost("{id}/deactivate")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeactivateUser(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();
            user.IsActive = false;
            await _userRepository.UpdateAsync(user);
            return Ok($"User {id} deactivated.");
        }

        /// <summary>
        /// Activate a user account (admin only).
        /// </summary>
        [HttpPost("{id}/activate")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> ActivateUser(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();
            user.IsActive = true;
            await _userRepository.UpdateAsync(user);
            return Ok($"User {id} activated.");
        }

        private static UserProfileDTO MapToProfileDTO(User user) => new UserProfileDTO
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
