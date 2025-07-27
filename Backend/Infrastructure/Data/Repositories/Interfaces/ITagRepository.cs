
namespace Raqmiya.Infrastructure
{
    public interface ITagRepository
    {
        Task<List<Tag>> GetAllTagsAsync();
        Task<Tag?> GetByIdAsync(int id);
        Task<bool> ExistsAsync(int id);
        // Add more methods as needed for tag management
    }
}
