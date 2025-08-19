namespace Raqmiya.Infrastructure
{
    public interface ICategoryRepository
    {
        Task<List<Category>> GetAllCategoriesAsync();
        Task<List<Category>> GetCategoriesHierarchyAsync();
        Task<List<Category>> GetChildCategoriesAsync(int parentId);
        Task<List<int>> GetAllNestedCategoryIdsAsync(int categoryId);
        Task<Category?> GetByIdAsync(int id);
        Task<bool> ExistsAsync(int id);
        Task AddAsync(Category category);
        Task UpdateAsync(Category category);
        Task DeleteAsync(Category category);
        // Add more methods as needed for category management
    }
}
