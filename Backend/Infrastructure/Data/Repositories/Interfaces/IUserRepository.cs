using Raqmiya.Infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Raqmiya.Infrastructure
{
    public interface IUserRepository
    {


        Task<User?> GetByIdAsync(int id);
        Task<User?> GetUserByEmailAsync(string email);
        Task<User?> GetUserByUsernameAsync(string username);
        Task<User?> GetUserByEmailOrUsernameAsync(string identifier); // For login
        Task<bool> UserExistsByEmailAsync(string email);
        Task<bool> UserExistsByUsernameAsync(string username);
        Task AddAsync(User user);
        Task UpdateAsync(User user); // If you allow user profile updates
                                     // Add more methods as needed (e.g., GetUserRolesAsync)




        //// Get all users (Admin only)
        //IEnumerable<User> GetAll();

        //// Get a user by ID
        //User GetById(int id);

        //// Add a new user (if applicable, e.g., during registration)
        //void Add(User user);

        //// Update user profile
        //void Update(User user);

        //// Delete a user by ID (Admin only)
        //void Delete(int id);

        //// Get a user by email (for login or checks)
        //User GetByEmail(string email);

        //// Optional: Get a user by username
        //User GetByUsername(string username);

        //// Optional: Check if email exists (for validation)
        //bool EmailExists(string email);

        //// Optional: Check if username exists
        //bool UsernameExists(string username);
        //void SaveChanges();
    }
}