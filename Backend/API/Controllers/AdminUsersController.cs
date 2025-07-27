using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Raqmiya.Infrastructure;
using Shared.DTOs.AuthDTOs;
using System.Security.Claims;

namespace API.Controllers
{
    [ApiController]
    [Route("api/admin/users")]
    [Authorize(Roles = RoleConstants.Admin)]
    public class AdminUsersController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IAuthService _authService;
        private readonly ILogger<AdminUsersController> _logger;

        public AdminUsersController(IUserRepository userRepository, IAuthService authService, ILogger<AdminUsersController> logger)
        {
            _userRepository = userRepository;
            _authService = authService;
            _logger = logger;
        }

        [HttpPost]
        [ProducesResponseType(typeof(AuthResponseDTO), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> CreateAdmin([FromBody] RegisterRequestDTO request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            // Force role to Admin regardless of input
            request.Role = RoleConstants.Admin;
            try
            {
                var response = await _authService.RegisterAsync(request);
                if (response.Success)
                {
                    // AuthResponseDTO does not have UserId, so just return 201 with response
                    return Created("/api/admin/users", response); // Could enhance to return new user location if available
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating admin user: {Message}", ex.Message);
                return Problem("An error occurred while creating the admin user.");
            }
        }

        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<UserProfileDTO>), 200)]
        public async Task<ActionResult<IEnumerable<UserProfileDTO>>> GetAll()
        {
            try
            {
                var users = await _userRepository.GetAllAsync();
                return Ok(users.Select(MapToProfileDTO));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing users");
                return Problem("An error occurred while listing users.");
            }
        }

        [HttpGet("{id}")]
        [ProducesResponseType(typeof(UserProfileDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<UserProfileDTO>> GetById(int id)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(id);
                if (user == null) return NotFound();
                return Ok(MapToProfileDTO(user));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user by id");
                return Problem("An error occurred while fetching the user.");
            }
        }

        [HttpPost("{id}/deactivate")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeactivateUser(int id)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(id);
                if (user == null) return NotFound();
                user.IsActive = false;
                await _userRepository.UpdateAsync(user);
                return Ok($"User {id} deactivated.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deactivating user");
                return Problem("An error occurred while deactivating the user.");
            }
        }

        [HttpPost("{id}/activate")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> ActivateUser(int id)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(id);
                if (user == null) return NotFound();
                user.IsActive = true;
                await _userRepository.UpdateAsync(user);
                return Ok($"User {id} activated.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error activating user");
                return Problem("An error occurred while activating the user.");
            }
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
    }
}
