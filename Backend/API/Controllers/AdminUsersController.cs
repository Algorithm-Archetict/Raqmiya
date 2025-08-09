using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs.AuthDTOs;
using System.Security.Claims;
using Raqmiya.Infrastructure;
using AutoMapper;
using Shared.Constants;

namespace API.Controllers
{
    /// <summary>
    /// Admin controller for managing users (create, list, get, activate, deactivate).
    /// </summary>
    [ApiController]
    [Route(UserRoutes.AdminUsers)]
    [Authorize(Roles = RoleConstants.Admin)]
    public class AdminUsersController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IAuthService _authService;
        private readonly ILogger<AdminUsersController> _logger;
        private readonly IMapper _mapper;

        public AdminUsersController(IUserRepository userRepository, IAuthService authService, ILogger<AdminUsersController> logger, IMapper mapper)
        {
            _userRepository = userRepository;
            _authService = authService;
            _logger = logger;
            _mapper = mapper;
        }

        /// <summary>
        /// Create a new admin user.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(AuthResponseDTO), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> CreateAdmin([FromBody] RegisterRequestDTO request)
        {
            // ModelState check removed; FluentValidation will handle validation errors
            request.Role = RoleConstants.Admin;
            try
            {
                var response = await _authService.RegisterAsync(request);
                if (response.Success)
                {
                    return Created(UserRoutes.AdminUsers, response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, LogMessages.AdminUserCreateError, ex.Message);
                return Problem(ErrorMessages.AdminUserCreate);
            }
        }

        /// <summary>
        /// Get all users.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<UserProfileDTO>), 200)]
        public async Task<ActionResult<IEnumerable<UserProfileDTO>>> GetAll()
        {
            try
            {
                var users = await _userRepository.GetAllAsync();
                return Ok(_mapper.Map<IEnumerable<UserProfileDTO>>(users));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, LogMessages.UserListError);
                return Problem(ErrorMessages.UserList);
            }
        }

        /// <summary>
        /// Get a user by ID.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(UserProfileDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<UserProfileDTO>> GetById(int id)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(id);
                if (user == null) return NotFound();
                return Ok(_mapper.Map<UserProfileDTO>(user));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, LogMessages.UserGetByIdError);
                return Problem(ErrorMessages.UserGetById);
            }
        }

        /// <summary>
        /// Deactivate a user by ID.
        /// </summary>
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
                return Ok(string.Format(SuccessMessages.UserDeactivated, id));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, LogMessages.UserDeactivateError);
                return Problem(ErrorMessages.UserDeactivate);
            }
        }

        /// <summary>
        /// Activate a user by ID.
        /// </summary>
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
    }
}
