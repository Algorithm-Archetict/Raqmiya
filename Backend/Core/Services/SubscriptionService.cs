using Core.Interfaces;
using Infrastructure.Data.Repositories.Interfaces;
using Microsoft.Extensions.Logging;
using Raqmiya.Infrastructure;
using Shared.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Core.Services
{
    public class SubscriptionService : ISubscriptionService
    {
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IUserRepository _userRepository;
        private readonly IProductRepository _productRepository;
        private readonly ILogger<SubscriptionService> _logger;

        public SubscriptionService(
            ISubscriptionRepository subscriptionRepository,
            IUserRepository userRepository,
            IProductRepository productRepository,
            ILogger<SubscriptionService> logger)
        {
            _subscriptionRepository = subscriptionRepository;
            _userRepository = userRepository;
            _productRepository = productRepository;
            _logger = logger;
        }

        public async Task<SubscribeResponseDTO> SubscribeAsync(int followerId, int creatorId)
        {
            try
            {
                // Validate users exist
                var follower = await _userRepository.GetByIdAsync(followerId);
                var creator = await _userRepository.GetByIdAsync(creatorId);

                if (follower == null || creator == null)
                {
                    return new SubscribeResponseDTO
                    {
                        Success = false,
                        Message = "User not found",
                        IsSubscribed = false
                    };
                }

                // Check if creator is actually a creator
                if (creator.Role != "Creator")
                {
                    return new SubscribeResponseDTO
                    {
                        Success = false,
                        Message = "Can only subscribe to creators",
                        IsSubscribed = false
                    };
                }

                // Prevent self-subscription
                if (followerId == creatorId)
                {
                    return new SubscribeResponseDTO
                    {
                        Success = false,
                        Message = "Cannot subscribe to yourself",
                        IsSubscribed = false
                    };
                }

                // Check if already subscribed
                var existingSubscription = await _subscriptionRepository.GetByFollowerAndCreatorAsync(followerId, creatorId);
                if (existingSubscription != null)
                {
                    if (existingSubscription.IsActive)
                    {
                        return new SubscribeResponseDTO
                        {
                            Success = false,
                            Message = "Already subscribed to this creator",
                            IsSubscribed = true
                        };
                    }
                    else
                    {
                        // Reactivate subscription
                        existingSubscription.IsActive = true;
                        existingSubscription.SubscribedAt = DateTime.UtcNow;
                        await _subscriptionRepository.UpdateAsync(existingSubscription);

                        _logger.LogInformation("User {FollowerId} reactivated subscription to creator {CreatorId}", followerId, creatorId);

                        return new SubscribeResponseDTO
                        {
                            Success = true,
                            Message = "Successfully subscribed to creator",
                            IsSubscribed = true
                        };
                    }
                }

                // Create new subscription
                var subscription = new CreatorSubscription
                {
                    FollowerId = followerId,
                    CreatorId = creatorId,
                    SubscribedAt = DateTime.UtcNow,
                    IsActive = true
                };

                await _subscriptionRepository.CreateAsync(subscription);

                _logger.LogInformation("User {FollowerId} subscribed to creator {CreatorId}", followerId, creatorId);

                return new SubscribeResponseDTO
                {
                    Success = true,
                    Message = "Successfully subscribed to creator",
                    IsSubscribed = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error subscribing user {FollowerId} to creator {CreatorId}", followerId, creatorId);
                return new SubscribeResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while subscribing",
                    IsSubscribed = false
                };
            }
        }

        public async Task<UnsubscribeResponseDTO> UnsubscribeAsync(int followerId, int creatorId)
        {
            try
            {
                var subscription = await _subscriptionRepository.GetByFollowerAndCreatorAsync(followerId, creatorId);
                if (subscription == null)
                {
                    return new UnsubscribeResponseDTO
                    {
                        Success = false,
                        Message = "Not subscribed to this creator",
                        IsSubscribed = false
                    };
                }

                if (!subscription.IsActive)
                {
                    return new UnsubscribeResponseDTO
                    {
                        Success = false,
                        Message = "Already unsubscribed from this creator",
                        IsSubscribed = false
                    };
                }

                subscription.IsActive = false;
                await _subscriptionRepository.UpdateAsync(subscription);

                _logger.LogInformation("User {FollowerId} unsubscribed from creator {CreatorId}", followerId, creatorId);

                return new UnsubscribeResponseDTO
                {
                    Success = true,
                    Message = "Successfully unsubscribed from creator",
                    IsSubscribed = false
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unsubscribing user {FollowerId} from creator {CreatorId}", followerId, creatorId);
                return new UnsubscribeResponseDTO
                {
                    Success = false,
                    Message = "An error occurred while unsubscribing",
                    IsSubscribed = false
                };
            }
        }

        public async Task<CreatorProfileDTO> GetCreatorProfileAsync(int creatorId, int? currentUserId = null)
        {
            var creator = await _userRepository.GetByIdAsync(creatorId);
            if (creator == null || creator.Role != "Creator")
            {
                return null!;
            }

            // Check if creator is soft-deleted
            var isDeleted = creator.IsDeleted;
            
            var followerCount = await _subscriptionRepository.GetFollowerCountAsync(creatorId);
            var productCount = await _productRepository.GetProductsByCreatorCountAsync(creatorId);
            
            // Only check subscription status if creator is not deleted
            var isSubscribed = !isDeleted && currentUserId.HasValue && 
                              await _subscriptionRepository.IsSubscribedAsync(currentUserId.Value, creatorId);

            return new CreatorProfileDTO
            {
                Id = creator.Id,
                Username = creator.Username,
                ProfileDescription = creator.ProfileDescription,
                ProfileImageUrl = creator.ProfileImageUrl,
                IsSubscribed = isSubscribed,
                FollowerCount = followerCount,
                ProductCount = productCount,
                CreatedAt = creator.CreatedAt,
                IsDeleted = isDeleted,
                DeletedAt = creator.DeletedAt
            };
        }

        public async Task<SubscriptionStatusDTO> GetSubscriptionStatusAsync(int followerId, int creatorId)
        {
            var isSubscribed = await _subscriptionRepository.IsSubscribedAsync(followerId, creatorId);
            var subscription = isSubscribed ? await _subscriptionRepository.GetByFollowerAndCreatorAsync(followerId, creatorId) : null;

            return new SubscriptionStatusDTO
            {
                IsSubscribed = isSubscribed,
                SubscribedAt = subscription?.SubscribedAt
            };
        }

        public async Task<List<FollowerDTO>> GetCreatorFollowersAsync(int creatorId, int page = 1, int pageSize = 20)
        {
            var subscriptions = await _subscriptionRepository.GetByCreatorIdAsync(creatorId);
            var skip = (page - 1) * pageSize;

            return subscriptions
                .Skip(skip)
                .Take(pageSize)
                .Select(s => new FollowerDTO
                {
                    Id = s.Follower.Id,
                    Username = s.Follower.Username,
                    ProfileImageUrl = s.Follower.ProfileImageUrl,
                    SubscribedAt = s.SubscribedAt
                })
                .ToList();
        }

        public async Task<List<CreatorProfileDTO>> GetFollowingCreatorsAsync(int followerId, int page = 1, int pageSize = 20)
        {
            var subscriptions = await _subscriptionRepository.GetByFollowerIdAsync(followerId);
            var skip = (page - 1) * pageSize;

            var creatorProfiles = new List<CreatorProfileDTO>();
            foreach (var subscription in subscriptions.Skip(skip).Take(pageSize))
            {
                var creator = subscription.Creator;
                var followerCount = await _subscriptionRepository.GetFollowerCountAsync(creator.Id);
                var productCount = await _productRepository.GetProductsByCreatorCountAsync(creator.Id);

                creatorProfiles.Add(new CreatorProfileDTO
                {
                    Id = creator.Id,
                    Username = creator.Username,
                    ProfileDescription = creator.ProfileDescription,
                    ProfileImageUrl = creator.ProfileImageUrl,
                    IsSubscribed = true, // Since we're getting from subscriptions
                    FollowerCount = followerCount,
                    ProductCount = productCount,
                    CreatedAt = creator.CreatedAt
                });
            }

            return creatorProfiles;
        }

        public async Task<bool> IsSubscribedAsync(int followerId, int creatorId)
        {
            return await _subscriptionRepository.IsSubscribedAsync(followerId, creatorId);
        }

        public async Task<int> GetFollowerCountAsync(int creatorId)
        {
            return await _subscriptionRepository.GetFollowerCountAsync(creatorId);
        }

        public async Task<int> GetFollowingCountAsync(int followerId)
        {
            return await _subscriptionRepository.GetFollowingCountAsync(followerId);
        }
    }
}
