
using System.Security.Cryptography;

using System.Text;
using Microsoft.EntityFrameworkCore;

namespace Raqmiya.Infrastructure
{
    //public interface IAuthRepository
    //{
    //    Task<bool> RegisterAsync(string username, string password);
    //    Task<bool> LoginAsync(string username, string password);
    //}

    // Repository/AuthRepository.cs
    public class AuthRepository : IAuthRepository
    {
        private readonly RaqmiyaDbContext _db;

        public AuthRepository(RaqmiyaDbContext db)
        {
            _db = db;
        }

        public async Task<bool> RegisterAsync(string email, string username, string password, string role)
        {
            if (await _db.Users.AnyAsync(u => u.Email == email))
                return false;

            var salt = GenerateSalt();
            var hash = HashPassword(password, salt);

            var user = new User
            {
                Email = email,
                Username = username,
                HashedPassword = hash,
                Salt = salt,
                Role = role,
                CreatedAt = DateTime.UtcNow,

            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> LoginAsync(string username, string password)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return false;

            var inputHash = HashPassword(password, user.Salt);
            return inputHash == user.HashedPassword;
        }

        private string GenerateSalt()
        {
            var saltBytes = new byte[16];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(saltBytes);
            return Convert.ToBase64String(saltBytes);
        }

        public string HashPassword(string password, string salt)
        {
            using var sha256 = SHA256.Create();
            var combinedBytes = Encoding.UTF8.GetBytes(salt + password);
            var hashBytes = sha256.ComputeHash(combinedBytes);
            return Convert.ToBase64String(hashBytes);
        }

        public Task<bool> UserExistsByEmailAsync(string email)
        {
            throw new NotImplementedException();
        }

        public Task<User> GetUserByEmailOrUsernameAsync(string emailOrUsername)
        {
            throw new NotImplementedException();
        }

        public Task AddAsync(User newUser)
        {
            throw new NotImplementedException();
        }

        public Task<bool> UserExistsByUsernameAsync(string username)
        {
            throw new NotImplementedException();
        }
    }
}