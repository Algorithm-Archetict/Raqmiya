using Core.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Raqmiya.Infrastructure;
using Shared.DTOs.AuthDTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Core.Services
{
    public class AuthService : IAuthService
    {
        private readonly IAuthRepository _authRepository;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;
        private static readonly HashSet<string> AllowedRoles = new() { "Admin", "Creator", "Customer" };

        public AuthService(IAuthRepository authRepository, IConfiguration configuration, ILogger<AuthService> logger)
        {
            _authRepository = authRepository;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<AuthResponseDTO> RegisterAsync(RegisterRequestDTO request)
        {
            if (!AllowedRoles.Contains(request.Role))
            {
                return new AuthResponseDTO { Success = false, Message = "Invalid role. Allowed roles: Admin, Creator, Customer." };
            }
            if (await _authRepository.UserExistsByEmailAsync(request.Email))
            {
                return new AuthResponseDTO { Success = false, Message = "Email already registered." };
            }
            if (await _authRepository.UserExistsByUsernameAsync(request.Username))
            {
                return new AuthResponseDTO { Success = false, Message = "Username already taken." };
            }

            var salt = GenerateSalt();
            var hashedPassword = HashPassword(request.Password, salt);

            var newUser = new User
            {
                Username = request.Username,
                Email = request.Email,
                HashedPassword = hashedPassword,
                Salt = salt,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                Role = request.Role
            };

            await _authRepository.AddAsync(newUser);

            var token = GenerateJwtToken(newUser);

            return new AuthResponseDTO
            {
                Success = true,
                Token = token,
                Username = newUser.Username,
                Email = newUser.Email,
                Roles = new List<string> { newUser.Role },
                Message = "Registration successful."
            };
        }

        public async Task<AuthResponseDTO> LoginAsync(LoginRequestDTO request)
        {
            _logger.LogInformation("Login attempt for: {EmailOrUsername}", request.EmailOrUsername);
            
            var user = await _authRepository.GetUserByEmailOrUsernameAsync(request.EmailOrUsername);

            if (user == null)
            {
                _logger.LogWarning("User not found: {EmailOrUsername}", request.EmailOrUsername);
                return new AuthResponseDTO { Success = false, Message = "Invalid credentials." };
            }

            _logger.LogInformation("User found: {Username}, Email: {Email}, IsActive: {IsActive}", 
                user.Username, user.Email, user.IsActive);

            var hashedPasswordAttempt = HashPassword(request.Password, user.Salt);
            _logger.LogInformation("Password comparison - Stored: {StoredHash}, Attempt: {AttemptHash}", 
                user.HashedPassword, hashedPasswordAttempt);

            if (hashedPasswordAttempt != user.HashedPassword)
            {
                _logger.LogWarning("Password mismatch for user: {EmailOrUsername}", request.EmailOrUsername);
                return new AuthResponseDTO { Success = false, Message = "Invalid credentials." };
            }

            if (!user.IsActive)
            {
                _logger.LogWarning("Inactive account for user: {EmailOrUsername}", request.EmailOrUsername);
                return new AuthResponseDTO { Success = false, Message = "Account is inactive." };
            }

            var token = GenerateJwtToken(user);
            _logger.LogInformation("Login successful for user: {EmailOrUsername}", request.EmailOrUsername);

            return new AuthResponseDTO
            {
                Success = true,
                Token = token,
                Username = user.Username,
                Email = user.Email,
                Roles = new List<string> { user.Role },
                Message = "Login successful."
            };
        }

        private string GenerateSalt()
        {
            byte[] saltBytes = new byte[16];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(saltBytes);
            }
            return Convert.ToBase64String(saltBytes);
        }

        private string HashPassword(string password, string salt)
        {
            var saltBytes = Convert.FromBase64String(salt);
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, saltBytes, 10000, HashAlgorithmName.SHA256))
            {
                byte[] hash = pbkdf2.GetBytes(32);
                return Convert.ToBase64String(hash);
            }
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var jwtSecret = _configuration["Jwt:Secret"];
            if (string.IsNullOrEmpty(jwtSecret))
            {
                _logger.LogError("JWT Secret is not configured.");
                throw new InvalidOperationException("JWT Secret not configured.");
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expires = DateTime.UtcNow.AddHours(int.Parse(_configuration["Jwt:TokenValidityInHours"] ?? "1"));

            var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: expires,
                signingCredentials: creds
            );

            return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
