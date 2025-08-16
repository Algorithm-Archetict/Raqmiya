using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs;
using System.Security.Claims;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly ILogger<SubscriptionController> _logger;

        public SubscriptionController(
            ISubscriptionService subscriptionService,
            ILogger<SubscriptionController> logger)
        {
            _subscriptionService = subscriptionService;
            _logger = logger;
        }

        /// <summary>
        /// Subscribe to a creator
        /// </summary>
        [HttpPost("subscribe")]
        [Authorize]
        [ProducesResponseType(typeof(SubscribeResponseDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> Subscribe([FromBody] SubscribeRequestDTO request)
        {
            try
            {
                var followerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var response = await _subscriptionService.SubscribeAsync(followerId, request.CreatorId);

                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error subscribing to creator {CreatorId}", request.CreatorId);
                return StatusCode(500, new { success = false, message = "An error occurred while subscribing" });
            }
        }

        /// <summary>
        /// Unsubscribe from a creator
        /// </summary>
        [HttpPost("unsubscribe")]
        [Authorize]
        [ProducesResponseType(typeof(UnsubscribeResponseDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeRequestDTO request)
        {
            try
            {
                var followerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var response = await _subscriptionService.UnsubscribeAsync(followerId, request.CreatorId);

                if (response.Success)
                {
                    return Ok(response);
                }
                return BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unsubscribing from creator {CreatorId}", request.CreatorId);
                return StatusCode(500, new { success = false, message = "An error occurred while unsubscribing" });
            }
        }

        /// <summary>
        /// Get creator profile with subscription status
        /// </summary>
        [HttpGet("creator/{creatorId}")]
        [ProducesResponseType(typeof(CreatorProfileDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetCreatorProfile(int creatorId)
        {
            try
            {
                int? currentUserId = null;
                if (User.Identity?.IsAuthenticated == true)
                {
                    currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                }

                var profile = await _subscriptionService.GetCreatorProfileAsync(creatorId, currentUserId);
                if (profile == null)
                {
                    return NotFound(new { success = false, message = "Creator not found" });
                }

                return Ok(profile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting creator profile for creator {CreatorId}", creatorId);
                return StatusCode(500, new { success = false, message = "An error occurred while getting creator profile" });
            }
        }

        /// <summary>
        /// Get subscription status for current user and creator
        /// </summary>
        [HttpGet("status/{creatorId}")]
        [Authorize]
        [ProducesResponseType(typeof(SubscriptionStatusDTO), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetSubscriptionStatus(int creatorId)
        {
            try
            {
                var followerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var status = await _subscriptionService.GetSubscriptionStatusAsync(followerId, creatorId);
                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription status for creator {CreatorId}", creatorId);
                return StatusCode(500, new { success = false, message = "An error occurred while getting subscription status" });
            }
        }

        /// <summary>
        /// Get creator's followers (paginated)
        /// </summary>
        [HttpGet("creator/{creatorId}/followers")]
        [ProducesResponseType(typeof(List<FollowerDTO>), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetCreatorFollowers(int creatorId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var followers = await _subscriptionService.GetCreatorFollowersAsync(creatorId, page, pageSize);
                return Ok(followers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting followers for creator {CreatorId}", creatorId);
                return StatusCode(500, new { success = false, message = "An error occurred while getting followers" });
            }
        }

        /// <summary>
        /// Get creators that the current user is following (paginated)
        /// </summary>
        [HttpGet("following")]
        [Authorize]
        [ProducesResponseType(typeof(List<CreatorProfileDTO>), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetFollowingCreators([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var followerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var creators = await _subscriptionService.GetFollowingCreatorsAsync(followerId, page, pageSize);
                return Ok(creators);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting following creators");
                return StatusCode(500, new { success = false, message = "An error occurred while getting following creators" });
            }
        }

        /// <summary>
        /// Get follower count for a creator
        /// </summary>
        [HttpGet("creator/{creatorId}/follower-count")]
        [ProducesResponseType(typeof(int), 200)]
        public async Task<IActionResult> GetFollowerCount(int creatorId)
        {
            try
            {
                var count = await _subscriptionService.GetFollowerCountAsync(creatorId);
                return Ok(count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting follower count for creator {CreatorId}", creatorId);
                return StatusCode(500, new { success = false, message = "An error occurred while getting follower count" });
            }
        }

        /// <summary>
        /// Get following count for current user
        /// </summary>
        [HttpGet("following-count")]
        [Authorize]
        [ProducesResponseType(typeof(int), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetFollowingCount()
        {
            try
            {
                var followerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var count = await _subscriptionService.GetFollowingCountAsync(followerId);
                return Ok(count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting following count");
                return StatusCode(500, new { success = false, message = "An error occurred while getting following count" });
            }
        }
    }
}
