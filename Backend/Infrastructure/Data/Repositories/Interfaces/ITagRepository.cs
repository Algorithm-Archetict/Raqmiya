
namespace Raqmiya.Infrastructure
{
    public interface ITagRepository
    {
        Task<List<Tag>> GetAllTagsAsync();
        Task<Tag?> GetByIdAsync(int id);
        Task<bool> ExistsAsync(int id);
        Task<List<Tag>> GetTagsByCategoriesAsync(IEnumerable<int> categoryIds);
        // Add more methods as needed for tag management
    }
}
