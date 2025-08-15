using Infrastructure.Data.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Raqmiya.Infrastructure;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Infrastructure.Data.Repositories.Implementations
{
    public class SubscriptionRepository : ISubscriptionRepository
    {
        private readonly RaqmiyaDbContext _context;

        public SubscriptionRepository(RaqmiyaDbContext context)
        {
            _context = context;
        }

        public async Task<CreatorSubscription?> GetByFollowerAndCreatorAsync(int followerId, int creatorId)
        {
            return await _context.CreatorSubscriptions
                .Include(s => s.Follower)
                .Include(s => s.Creator)
                .FirstOrDefaultAsync(s => s.FollowerId == followerId && s.CreatorId == creatorId && !s.IsDeleted);
        }

        public async Task<List<CreatorSubscription>> GetByFollowerIdAsync(int followerId)
        {
            return await _context.CreatorSubscriptions
                .Include(s => s.Creator)
                .Where(s => s.FollowerId == followerId && s.IsActive && !s.IsDeleted)
                .OrderByDescending(s => s.SubscribedAt)
                .ToListAsync();
        }

        public async Task<List<CreatorSubscription>> GetByCreatorIdAsync(int creatorId)
        {
            return await _context.CreatorSubscriptions
                .Include(s => s.Follower)
                .Where(s => s.CreatorId == creatorId && s.IsActive && !s.IsDeleted)
                .OrderByDescending(s => s.SubscribedAt)
                .ToListAsync();
        }

        public async Task<int> GetFollowerCountAsync(int creatorId)
        {
            return await _context.CreatorSubscriptions
                .CountAsync(s => s.CreatorId == creatorId && s.IsActive && !s.IsDeleted);
        }

        public async Task<int> GetFollowingCountAsync(int followerId)
        {
            return await _context.CreatorSubscriptions
                .CountAsync(s => s.FollowerId == followerId && s.IsActive && !s.IsDeleted);
        }

        public async Task<bool> IsSubscribedAsync(int followerId, int creatorId)
        {
            return await _context.CreatorSubscriptions
                .AnyAsync(s => s.FollowerId == followerId && s.CreatorId == creatorId && s.IsActive && !s.IsDeleted);
        }

        public async Task<CreatorSubscription> CreateAsync(CreatorSubscription subscription)
        {
            _context.CreatorSubscriptions.Add(subscription);
            await _context.SaveChangesAsync();
            return subscription;
        }

        public async Task UpdateAsync(CreatorSubscription subscription)
        {
            _context.CreatorSubscriptions.Update(subscription);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(CreatorSubscription subscription)
        {
            subscription.IsDeleted = true;
            subscription.DeletedAt = System.DateTime.UtcNow;
            await UpdateAsync(subscription);
        }

        public async Task<bool> ExistsAsync(int followerId, int creatorId)
        {
            return await _context.CreatorSubscriptions
                .AnyAsync(s => s.FollowerId == followerId && s.CreatorId == creatorId && !s.IsDeleted);
        }
    }
}
