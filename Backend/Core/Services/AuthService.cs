using Core.Interfaces;
using Microsoft.Extensions.Logging;
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
using Infrastructure;

namespace Core.Services
{
    public class AuthService : IAuthService
    {
        private readonly IAuthRepository _authRepository; // You'll need to create this interface and implementation
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;

        public AuthService(IAuthRepository authRepository, IConfiguration configuration, ILogger<AuthService> logger)
        {
            _authRepository = authRepository;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<AuthResponseDTO> RegisterAsync(RegisterRequestDTO request)
        {
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
                Role = "Buyer" // Default role, or allow request.Role if you implement role selection
            };

            await _authRepository.AddAsync(newUser);

            // After registration, log them in immediately by generating a token
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
            var user = await _authRepository.GetUserByEmailOrUsernameAsync(request.EmailOrUsername);

            if (user == null)
            {
                return new AuthResponseDTO { Success = false, Message = "Invalid credentials." };
            }

            // Verify password using the stored salt
            var hashedPasswordAttempt = HashPassword(request.Password, user.Salt);

            if (hashedPasswordAttempt != user.HashedPassword)
            {
                return new AuthResponseDTO { Success = false, Message = "Invalid credentials." };
            }

            if (!user.IsActive)
            {
                return new AuthResponseDTO { Success = false, Message = "Account is inactive." };
            }

            var token = GenerateJwtToken(user);

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
            // Generate a random salt (e.g., 16 bytes for a 32-character hex string)
            byte[] saltBytes = new byte[16];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(saltBytes);
            }
            return Convert.ToBase64String(saltBytes); // Or to Hex string
        }

        private string HashPassword(string password, string salt)
        {
            // Use a strong hashing algorithm like PBKDF2 (similar to what ASP.NET Core Identity uses)
            // For simplicity, this is a placeholder. You should use a library like Microsoft.AspNetCore.Identity.PasswordHasher
            // or a dedicated hashing implementation.
            // Example: Using Rfc2898DeriveBytes
            var saltBytes = Convert.FromBase64String(salt);
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, saltBytes, 10000, HashAlgorithmName.SHA256))
            {
                byte[] hash = pbkdf2.GetBytes(32); // 32 bytes for a 256-bit hash
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
                new Claim(ClaimTypes.Role, user.Role) // Add user roles
            };

            var jwtSecret = _configuration["Jwt:Secret"];
            if (string.IsNullOrEmpty(jwtSecret))
            {
                _logger.LogError("JWT Secret is not configured.");
                throw new InvalidOperationException("JWT Secret not configured.");
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expires = DateTime.UtcNow.AddHours(int.Parse(_configuration["Jwt:TokenValidityInHours"] ?? "1")); // Configurable expiry

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: expires,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
