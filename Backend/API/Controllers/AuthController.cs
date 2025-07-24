using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs.AuthDTOs;
using System.Security.Claims;

namespace API.Controllers
{
    /// <summary>
    /// Controller for authentication (register, login, get current user).
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        /// <summary>
        /// Register a new user (Admin, Creator, or Customer).
        /// </summary>
        [HttpPost("register")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AuthResponseDTO), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDTO request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var response = await _authService.RegisterAsync(request);
                if (response.Success)
                {
                    return Ok(response); // Returns token on successful registration
                }
                return BadRequest(response); // Returns error message from service
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during user registration: {Message}", ex.Message);
                return StatusCode(500, "An internal server error occurred during registration.");
            }
        }

        /// <summary>
        /// Login a user and receive a JWT token.
        /// </summary>
        [HttpPost("login")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AuthResponseDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> Login([FromBody] LoginRequestDTO request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var response = await _authService.LoginAsync(request);
                if (response.Success)
                {
                    return Ok(response); // Returns token on successful login
                }
                return Unauthorized(response); // Returns error message for invalid credentials
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during user login: {Message}", ex.Message);
                return StatusCode(500, "An internal server error occurred during login.");
            }
        }

        /// <summary>
        /// Gets the current authenticated user's profile info from JWT.
        /// </summary>
        [HttpGet("me")]
        [Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        public IActionResult GetCurrentUser()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var username = User.FindFirstValue(ClaimTypes.Name);
            var email = User.FindFirstValue(ClaimTypes.Email);
            var role = User.FindFirstValue(ClaimTypes.Role);

            return Ok(new
            {
                Id = userId,
                Username = username,
                Email = email,
                Role = role
            });
        }
    }
}
