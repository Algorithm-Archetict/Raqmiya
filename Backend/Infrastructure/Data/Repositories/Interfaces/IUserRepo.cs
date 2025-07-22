using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface IUserRepo
    {

        // Get all users (Admin only)
        IEnumerable<User> GetAll();

        // Get a user by ID
        User GetById(int id);

        // Add a new user (if applicable, e.g., during registration)
        void Add(User user);

        // Update user profile
        void Update(User user);

        // Delete a user by ID (Admin only)
        void Delete(int id);

        // Get a user by email (for login or checks)
        User GetByEmail(string email);

        // Optional: Get a user by username
        User GetByUsername(string username);

        // Optional: Check if email exists (for validation)
        bool EmailExists(string email);

        // Optional: Check if username exists
        bool UsernameExists(string username);
        void SaveChanges();



    }
}
