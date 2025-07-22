using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface ICategoryRepository
    {
        Task<List<Category>> GetAllCategoriesAsync();
        Task<Category?> GetByIdAsync(int id);
        Task<bool> ExistsAsync(int id);
        // Add more methods as needed for category management
    }
}
