namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface IAuthRepository
    {
        Task<bool> RegisterAsync(string email, string username, string password, string role);
        Task<bool> LoginAsync(string username, string password);

        string HashPassword(string password, string salt);
    }
}
