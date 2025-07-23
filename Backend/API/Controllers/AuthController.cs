using Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs.AuthDTOs;

namespace API.Controllers
{
    //public class AuthController : Controller
    //{
    //    public IActionResult Index()
    //    {
    //        return View();
    //    }
    //}


    [ApiController]
    [Route("api/[controller]")] // api/Auth
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        [HttpPost("register")]
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
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error during user registration: {Message}", ex.Message);
                return StatusCode(500, "An internal server error occurred during registration.");
            }
        }

        [HttpPost("login")]
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
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error during user login: {Message}", ex.Message);
                return StatusCode(500, "An internal server error occurred during login.");
            }
        }
    }
}
