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
        [ProducesResponseType(403)]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDTO request)
        {
            _logger.LogInformation("Registration attempt received: Email={Email}, Username={Username}, Role={Role}", 
                request.Email, request.Username, request.Role);

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                _logger.LogWarning("Model validation failed: {Errors}", string.Join(", ", errors));
                return BadRequest(new { Errors = errors, ModelState = ModelState });
            }

            // Restrict Admin registration to only authenticated admins
            if (request.Role == RoleConstants.Admin)
            {
                if (!User.Identity?.IsAuthenticated ?? true || !User.IsInRole(RoleConstants.Admin))
                {
                    return Forbid("Only authenticated admins can create new admin accounts.");
                }
            }

            try
            {
                var response = await _authService.RegisterAsync(request);
                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during user registration: {Message}", ex.Message);
                return Problem("An internal server error occurred during registration.");
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
            _logger.LogInformation("Login attempt received: EmailOrUsername={EmailOrUsername}", request.EmailOrUsername);

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                _logger.LogWarning("Login model validation failed: {Errors}", string.Join(", ", errors));
                return BadRequest(new { Errors = errors, ModelState = ModelState });
            }

            try
            {
                var response = await _authService.LoginAsync(request);
                if (response.Success)
                {
                    _logger.LogInformation("Login successful for user: {EmailOrUsername}", request.EmailOrUsername);
                    return Ok(response);
                }
                _logger.LogWarning("Login failed for user: {EmailOrUsername}, Message: {Message}", 
                    request.EmailOrUsername, response.Message);
                return Unauthorized(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during user login: {Message}", ex.Message);
                return Problem("An internal server error occurred during login.");
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
            try
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current user from JWT");
                return Problem("An error occurred while fetching the current user.");
            }
        }
    }
}
