using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface ITagRepository
    {
        Task<List<Tag>> GetAllTagsAsync();
        Task<Tag?> GetByIdAsync(int id);
        Task<bool> ExistsAsync(int id);
        // Add more methods as needed for tag management
    }
}
