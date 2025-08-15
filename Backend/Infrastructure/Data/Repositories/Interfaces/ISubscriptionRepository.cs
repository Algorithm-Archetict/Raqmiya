using Raqmiya.Infrastructure;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Data.Repositories.Interfaces
{
    public interface ISubscriptionRepository
    {
        Task<CreatorSubscription?> GetByFollowerAndCreatorAsync(int followerId, int creatorId);
        Task<List<CreatorSubscription>> GetByFollowerIdAsync(int followerId);
        Task<List<CreatorSubscription>> GetByCreatorIdAsync(int creatorId);
        Task<int> GetFollowerCountAsync(int creatorId);
        Task<int> GetFollowingCountAsync(int followerId);
        Task<bool> IsSubscribedAsync(int followerId, int creatorId);
        Task<CreatorSubscription> CreateAsync(CreatorSubscription subscription);
        Task UpdateAsync(CreatorSubscription subscription);
        Task DeleteAsync(CreatorSubscription subscription);
        Task<bool> ExistsAsync(int followerId, int creatorId);
    }
}
