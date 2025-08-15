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

        /// <summary>
        /// Request a password reset for the specified email address.
        /// </summary>
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ForgotPasswordResponseDTO), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDTO request)
        {
            if (request == null)
            {
                _logger.LogWarning("Forgot password request is null");
                return BadRequest("Invalid request data");
            }

            _logger.LogInformation("Forgot password request for email: {Email}", request.Email);

            try
            {
                var response = await _authService.ForgotPasswordAsync(request);
                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing forgot password request");
                return Problem("An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Reset password using a valid reset token.
        /// </summary>
        [HttpPost("reset-password")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PasswordResetResponseDTO), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDTO request)
        {
            if (request == null)
            {
                _logger.LogWarning("Reset password request is null");
                return BadRequest("Invalid request data");
            }

            _logger.LogInformation("Reset password request with token");

            try
            {
                var response = await _authService.ResetPasswordAsync(request);
                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing reset password request");
                return Problem("An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Verify if a reset token is valid and not expired.
        /// </summary>
        [HttpGet("verify-reset-token")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(VerifyTokenResponseDTO), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> VerifyResetToken([FromQuery] string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                _logger.LogWarning("Verify reset token request with empty token");
                return BadRequest("Token is required");
            }

            _logger.LogInformation("Verifying reset token");

            try
            {
                var response = await _authService.VerifyResetTokenAsync(token);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying reset token");
                return Problem("An error occurred while verifying the token.");
            }
        }

        /// <summary>
        /// Verify email address using a verification token.
        /// </summary>
        [HttpPost("verify-email")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AuthResponseDTO), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> VerifyEmail([FromBody] EmailVerificationDTO request)
        {
            if (request == null)
            {
                _logger.LogWarning("Email verification request is null");
                return BadRequest("Invalid request data");
            }

            _logger.LogInformation("Email verification request with token");

            try
            {
                var response = await _authService.VerifyEmailAsync(request);
                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing email verification request");
                return Problem("An error occurred while verifying your email.");
            }
        }

        /// <summary>
        /// Resend verification email for pending registration.
        /// </summary>
        [HttpPost("resend-verification")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ResendVerificationResponseDTO), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationDTO request)
        {
            if (request == null)
            {
                _logger.LogWarning("Resend verification request is null");
                return BadRequest("Invalid request data");
            }

            _logger.LogInformation("Resend verification request for email: {Email}", request.Email);

            try
            {
                var response = await _authService.ResendVerificationAsync(request);
                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing resend verification request");
                return Problem("An error occurred while sending the verification email.");
            }
        }

        /// <summary>
        /// Request account deletion with email confirmation.
        /// </summary>
        [HttpPost("request-account-deletion")]
        [Authorize]
        [ProducesResponseType(typeof(RequestAccountDeletionResponseDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> RequestAccountDeletion([FromBody] RequestAccountDeletionDTO request)
        {
            if (request == null)
            {
                _logger.LogWarning("Account deletion request is null");
                return BadRequest("Invalid request data");
            }

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (userId == 0)
            {
                return Unauthorized("User not authenticated");
            }

            _logger.LogInformation("Account deletion request for user: {UserId}", userId);

            try
            {
                var response = await _authService.RequestAccountDeletionAsync(request, userId);
                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing account deletion request");
                return Problem("An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Confirm account deletion using email token.
        /// </summary>
        [HttpPost("confirm-account-deletion")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ConfirmAccountDeletionResponseDTO), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> ConfirmAccountDeletion([FromBody] ConfirmAccountDeletionDTO request)
        {
            if (request == null)
            {
                _logger.LogWarning("Confirm account deletion request is null");
                return BadRequest("Invalid request data");
            }

            _logger.LogInformation("Confirm account deletion request with token");

            try
            {
                var response = await _authService.ConfirmAccountDeletionAsync(request);
                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming account deletion");
                return Problem("An error occurred while confirming account deletion.");
            }
        }

        /// <summary>
        /// Restore a soft-deleted account.
        /// </summary>
        [HttpPost("restore-account")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(RestoreAccountResponseDTO), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> RestoreAccount([FromBody] RestoreAccountDTO request)
        {
            if (request == null)
            {
                _logger.LogWarning("Restore account request is null");
                return BadRequest("Invalid request data");
            }

            _logger.LogInformation("Restore account request with token");

            try
            {
                var response = await _authService.RestoreAccountAsync(request);
                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring account");
                return Problem("An error occurred while restoring the account.");
            }
        }

        /// <summary>
        /// Cancel account deletion request.
        /// </summary>
        [HttpPost("cancel-account-deletion")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(CancelAccountDeletionResponseDTO), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> CancelAccountDeletion([FromBody] CancelAccountDeletionDTO request)
        {
            if (request == null)
            {
                _logger.LogWarning("Cancel account deletion request is null");
                return BadRequest("Invalid request data");
            }

            _logger.LogInformation("Cancel account deletion request with token");

            try
            {
                var response = await _authService.CancelAccountDeletionAsync(request);
                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling account deletion");
                return Problem("An error occurred while cancelling account deletion.");
            }
        }
    }
}
