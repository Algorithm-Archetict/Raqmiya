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

        public string GenerateSalt()
        {
            var saltBytes = new byte[16];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(saltBytes);
            return Convert.ToBase64String(saltBytes);
        }

        public string HashPassword(string password, string salt)
        {
            var saltBytes = Convert.FromBase64String(salt);
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, saltBytes, 10000, HashAlgorithmName.SHA256))
            {
                byte[] hash = pbkdf2.GetBytes(32);
                return Convert.ToBase64String(hash);
            }
        }

        public async Task<bool> UserExistsByEmailAsync(string email)
        {
            return await _db.Users.AnyAsync(u => u.Email == email);
        }

        public async Task<bool> UserExistsByUsernameAsync(string username)
        {
            return await _db.Users.AnyAsync(u => u.Username == username);
        }

        public async Task<User> GetUserByEmailOrUsernameAsync(string emailOrUsername)
        {
            return await _db.Users.FirstOrDefaultAsync(u => u.Email == emailOrUsername || u.Username == emailOrUsername);
        }

        public async Task AddAsync(User newUser)
        {
            _db.Users.Add(newUser);
            await _db.SaveChangesAsync();
        }
    }
}