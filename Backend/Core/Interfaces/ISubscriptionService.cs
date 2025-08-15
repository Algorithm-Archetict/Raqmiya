using Shared.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Core.Interfaces
{
    public interface ISubscriptionService
    {
        Task<SubscribeResponseDTO> SubscribeAsync(int followerId, int creatorId);
        Task<UnsubscribeResponseDTO> UnsubscribeAsync(int followerId, int creatorId);
        Task<CreatorProfileDTO> GetCreatorProfileAsync(int creatorId, int? currentUserId = null);
        Task<SubscriptionStatusDTO> GetSubscriptionStatusAsync(int followerId, int creatorId);
        Task<List<FollowerDTO>> GetCreatorFollowersAsync(int creatorId, int page = 1, int pageSize = 20);
        Task<List<CreatorProfileDTO>> GetFollowingCreatorsAsync(int followerId, int page = 1, int pageSize = 20);
        Task<bool> IsSubscribedAsync(int followerId, int creatorId);
        Task<int> GetFollowerCountAsync(int creatorId);
        Task<int> GetFollowingCountAsync(int followerId);
    }
}
