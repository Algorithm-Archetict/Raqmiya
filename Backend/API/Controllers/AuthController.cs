using Shared.Constants;
using API.Constants;
using AutoMapper;
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
    [Route(AuthRoutes.Auth)]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;
        private readonly IMapper _mapper;

        public AuthController(IAuthService authService, ILogger<AuthController> logger, IMapper mapper)
        {
            _authService = authService;
            _logger = logger;
            _mapper = mapper;
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
            _logger.LogInformation(LogMessages.RegistrationAttempt, request.Email, request.Username, request.Role);

            // Restrict Admin registration to only authenticated admins
            if (request.Role == RoleConstants.Admin)
            {
                if (!User.Identity?.IsAuthenticated ?? true || !User.IsInRole(RoleConstants.Admin))
                {
                    return Forbid(ErrorMessages.AdminRegistrationForbidden);
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
                _logger.LogError(ex, LogMessages.RegistrationError, ex.Message);
                return Problem(ErrorMessages.RegistrationError);
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
            if (request == null)
            {
                _logger.LogWarning("Login request is null");
                return BadRequest("Invalid request data");
            }

            _logger.LogInformation("Login attempt for: {EmailOrUsername}", request.EmailOrUsername);

            try
            {
                var response = await _authService.LoginAsync(request);
                if (response.Success)
                {
                    _logger.LogInformation(LogMessages.LoginSuccess, request.EmailOrUsername);
                    _logger.LogInformation("Generated token: {Token}", response.Token?.Substring(0, Math.Min(50, response.Token?.Length ?? 0)) + "...");
                    return Ok(response);
                }
                _logger.LogWarning(LogMessages.LoginFailed, request.EmailOrUsername, response.Message);
                return Unauthorized(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, LogMessages.LoginError, ex.Message);
                return Problem(ErrorMessages.LoginError);
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

        /// <summary>
        /// Validates the current JWT token and returns true if valid.
        /// </summary>
        [HttpGet("validate-token")]
        [Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        public IActionResult ValidateToken()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Invalid token");
                }

                return Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating token");
                return Unauthorized("Invalid token");
            }
        }

        /// <summary>
        /// Gets detailed user information for debugging and security monitoring.
        /// </summary>
        [HttpGet("debug-user")]
        [Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        public IActionResult GetDebugUserInfo()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var username = User.FindFirstValue(ClaimTypes.Name);
                var email = User.FindFirstValue(ClaimTypes.Email);
                var role = User.FindFirstValue(ClaimTypes.Role);

                _logger.LogInformation("Debug user info request - UserId: {UserId}, Username: {Username}, Email: {Email}, Role: {Role}", 
                    userId, username, email, role);

                return Ok(new
                {
                    UserId = userId,
                    Username = username,
                    Email = email,
                    Role = role,
                    IsAuthenticated = User.Identity?.IsAuthenticated ?? false,
                    AuthenticationType = User.Identity?.AuthenticationType,
                    Claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting debug user info");
                return Problem("An error occurred while fetching debug user info.");
            }
        }
    }
}
