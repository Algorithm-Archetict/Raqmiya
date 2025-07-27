using Raqmiya.Infrastructure;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Raqmiya.Infrastructure
{
    /// <summary>
    /// Repository interface for user data access and management.
    /// </summary>
    public interface IUserRepository
    {
        /// <summary>Gets a user by their ID.</summary>
        Task<User?> GetByIdAsync(int id);
        /// <summary>Gets a user by their email.</summary>
        Task<User?> GetUserByEmailAsync(string email);
        /// <summary>Gets a user by their username.</summary>
        Task<User?> GetUserByUsernameAsync(string username);
        /// <summary>Gets a user by email or username (for login).</summary>
        Task<User?> GetUserByEmailOrUsernameAsync(string identifier);
        /// <summary>Checks if a user exists by email.</summary>
        Task<bool> UserExistsByEmailAsync(string email);
        /// <summary>Checks if a user exists by username.</summary>
        Task<bool> UserExistsByUsernameAsync(string username);
        /// <summary>Adds a new user.</summary>
        Task AddAsync(User user);
        /// <summary>Updates an existing user.</summary>
        Task UpdateAsync(User user);
        /// <summary>Gets all users (admin only).</summary>
        Task<List<User>> GetAllAsync();
    }
}