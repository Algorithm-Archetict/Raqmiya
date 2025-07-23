

namespace Raqmiya.Infrastructure
{
    public interface ICategoryRepository
    {
        Task<List<Category>> GetAllCategoriesAsync();
        Task<Category?> GetByIdAsync(int id);
        Task<bool> ExistsAsync(int id);
        // Add more methods as needed for category management
    }
}
