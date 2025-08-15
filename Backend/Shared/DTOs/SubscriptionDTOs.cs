using System;
using System.Collections.Generic;

namespace Shared.DTOs
{
    public class SubscribeRequestDTO
    {
        public int CreatorId { get; set; }
    }

    public class SubscribeResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool IsSubscribed { get; set; }
    }

    public class UnsubscribeRequestDTO
    {
        public int CreatorId { get; set; }
    }

    public class UnsubscribeResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool IsSubscribed { get; set; }
    }

    public class CreatorProfileDTO
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfileDescription { get; set; }
        public string? ProfileImageUrl { get; set; }
        public bool IsSubscribed { get; set; }
        public int FollowerCount { get; set; }
        public int ProductCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
    }

    public class SubscriptionStatusDTO
    {
        public bool IsSubscribed { get; set; }
        public DateTime? SubscribedAt { get; set; }
    }

    public class FollowerDTO
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
        public DateTime SubscribedAt { get; set; }
    }

    public class CreatorFollowersResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<FollowerDTO> Followers { get; set; } = new List<FollowerDTO>();
        public int TotalCount { get; set; }
    }
}
