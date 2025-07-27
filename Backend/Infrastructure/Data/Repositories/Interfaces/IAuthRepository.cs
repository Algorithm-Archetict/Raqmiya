namespace Raqmiya.Infrastructure
{
    public interface IAuthRepository
    {
        Task<bool> RegisterAsync(string email, string username, string password, string role);
        Task<bool> LoginAsync(string username, string password);

        string HashPassword(string password, string salt);
        Task<bool> UserExistsByEmailAsync(string email);
        Task<User> GetUserByEmailOrUsernameAsync(string emailOrUsername);
        Task AddAsync(User newUser);
        Task<bool> UserExistsByUsernameAsync(string username);
    }



}
