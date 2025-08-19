using System;
using System.Linq;
using System.Security.Claims;
using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Raqmiya.Infrastructure;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IMessagingService _svc;
        private readonly ILogger<ChatHub> _logger;
        private static readonly ConcurrentDictionary<int, int> _onlineCounts = new();

        public ChatHub(IMessagingService svc, ILogger<ChatHub> logger)
        {
            _svc = svc;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            // Add to per-user group for direct notifications
            if (TryGetUserId(out var userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
                var newCount = _onlineCounts.AddOrUpdate(userId, 1, (_, c) => c + 1);
                if (newCount == 1)
                {
                    // first connection for this user -> announce online
                    await Clients.All.SendAsync("UserPresenceChanged", new { userId, online = true });
                }
            }

            // Optionally auto-join a conversation group if query has conversationId
            var httpContext = Context.GetHttpContext();
            var conversationId = httpContext?.Request.Query["conversationId"].ToString();
            if (Guid.TryParse(conversationId, out var convId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, GroupForConversation(convId));
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (TryGetUserId(out var userId))
            {
                if (_onlineCounts.AddOrUpdate(userId, 0, (_, c) => Math.Max(0, c - 1)) == 0)
                {
                    _onlineCounts.TryRemove(userId, out _);
                    await Clients.All.SendAsync("UserPresenceChanged", new { userId, online = false });
                }
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task JoinConversationGroup(string conversationId)
        {
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupForConversation(convId));
        }

        public async Task<object> SendMessage(string conversationId, string text)
        {
            if (!TryGetUserId(out var userId)) throw new HubException("Unauthorized");
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");

            _logger.LogInformation("ChatHub.SendMessage userId={UserId} convId={ConversationId}", userId, convId);
            var msg = await _svc.SendMessageAsync(userId, convId, text);
            var payload = new
            {
                id = msg.Id,
                conversationId = msg.ConversationId,
                senderId = msg.SenderId,
                body = msg.Body,
                type = msg.Type.ToString(),
                createdAt = msg.CreatedAt,
                attachmentUrl = msg.AttachmentUrl,
                attachmentType = msg.AttachmentType
            };
            await Clients.Group(GroupForConversation(convId)).SendAsync("ReceiveMessage", payload);
            return payload;
        }

        public async Task Typing(string conversationId)
        {
            if (!TryGetUserId(out var userId)) throw new HubException("Unauthorized");
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");
            await Clients.Group(GroupForConversation(convId)).SendAsync("Typing", new { conversationId = convId, userId, at = DateTime.UtcNow });
        }

        public async Task MarkSeen(string conversationId, string messageId)
        {
            if (!TryGetUserId(out var userId)) throw new HubException("Unauthorized");
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");
            if (!Guid.TryParse(messageId, out var msgId)) throw new HubException("Invalid messageId");
            // For now, this is a broadcast-only acknowledgement (no persistence)
            await Clients.Group(GroupForConversation(convId)).SendAsync("MessageSeen", new { conversationId = convId, messageId = msgId, seenByUserId = userId, at = DateTime.UtcNow });
        }

        public async Task<object> CreateMessageRequest(string creatorId, string firstMessageText)
        {
            if (!TryGetUserId(out var customerId)) throw new HubException("Unauthorized");
            if (!int.TryParse(creatorId, out var creatorIdInt)) throw new HubException("Invalid creatorId");
            try
            {
                var (conv, req) = await _svc.CreateMessageRequestAsync(customerId, creatorIdInt, firstMessageText);
                var convDto = new
                {
                    id = conv.Id,
                    creatorId = conv.CreatorId,
                    customerId = conv.CustomerId,
                    status = conv.Status.ToString(),
                    createdAt = conv.CreatedAt
                };
                var reqDto = new { id = req.Id, conversationId = req.ConversationId, status = req.Status.ToString(), firstMessageText = req.FirstMessageText, createdAt = req.CreatedAt };

                // Notify creator's user group about new pending request
                await Clients.Group($"user:{creatorIdInt}").SendAsync("ConversationUpdated", convDto);
                return new { conversation = convDto, request = reqDto };
            }
            catch (InvalidOperationException ex)
            {
                // Likely pending/active conversation exists or business rule violation
                throw new HubException(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                throw new HubException(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                throw new HubException(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateMessageRequest failed. customerId={CustomerId}, creatorId={CreatorId}", customerId, creatorIdInt);
                // Surface underlying message for easier debugging in development
                throw new HubException($"Failed to create message request: {ex.Message}");
            }
        }

        public async Task<object> RespondToMessageRequest(string conversationId, bool accept)
        {
            if (!TryGetUserId(out var creatorId)) throw new HubException("Unauthorized");
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");

            _logger.LogInformation("ChatHub.RespondToMessageRequest creatorId={CreatorId} convId={ConversationId} accept={Accept}", creatorId, convId, accept);
            var result = await _svc.RespondToMessageRequestAsync(creatorId, convId, accept);
            var conv = result.conversation;
            if (!accept)
            {
                // Hard-deleted: notify both user groups and conversation group for immediate UI removal
                var payload = new { id = conv.Id };
                await Clients.Group(GroupForConversation(convId)).SendAsync("ConversationDeleted", payload);
                await Clients.Group($"user:{conv.CustomerId}").SendAsync("ConversationDeleted", payload);
                await Clients.Group($"user:{conv.CreatorId}").SendAsync("ConversationDeleted", payload);
                return payload;
            }
            else
            {
                var convDto = new { id = conv.Id, status = conv.Status.ToString(), creatorId = conv.CreatorId, customerId = conv.CustomerId };
                // Accepted: notify both participants
                await Clients.Group(GroupForConversation(convId)).SendAsync("ConversationUpdated", convDto);
                await Clients.Group($"user:{conv.CustomerId}").SendAsync("ConversationUpdated", convDto);
                await Clients.Group($"user:{conv.CreatorId}").SendAsync("ConversationUpdated", convDto);
                // If a first message was created from the request, broadcast it as well
                if (result.firstMessage != null)
                {
                    var msg = result.firstMessage;
                    var msgDto = new { id = msg.Id, conversationId = msg.ConversationId, senderId = msg.SenderId, body = msg.Body, type = msg.Type.ToString(), createdAt = msg.CreatedAt, attachmentUrl = msg.AttachmentUrl, attachmentType = msg.AttachmentType };
                    // Broadcast to conversation group
                    await Clients.Group(GroupForConversation(convId)).SendAsync("ReceiveMessage", msgDto);
                    // Also broadcast to both participants' user groups in case they haven't joined the conversation group yet
                    await Clients.Group($"user:{conv.CustomerId}").SendAsync("ReceiveMessage", msgDto);
                    await Clients.Group($"user:{conv.CreatorId}").SendAsync("ReceiveMessage", msgDto);
                }
                return convDto;
            }
        }

        public async Task<object> CreateServiceRequest(string conversationId, string requirements, decimal? proposedBudget)
        {
            if (!TryGetUserId(out var customerId)) throw new HubException("Unauthorized");
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");

            var sr = await _svc.CreateServiceRequestAsync(customerId, convId, requirements, proposedBudget, null);
            var dto = new { id = sr.Id, conversationId = sr.ConversationId, requirements = sr.Requirements, proposedBudget = sr.ProposedBudget, currency = sr.Currency, status = sr.Status.ToString(), deadlineUtc = sr.CreatorDeadlineUtc };
            await Clients.Group(GroupForConversation(convId)).SendAsync("ServiceRequestUpdated", dto);
            return dto;
        }

        public async Task<object> AcceptServiceRequest(string conversationId, string serviceRequestId, DateTime deadlineUtc)
        {
            if (!TryGetUserId(out var creatorId)) throw new HubException("Unauthorized");
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");
            if (!Guid.TryParse(serviceRequestId, out var srId)) throw new HubException("Invalid serviceRequestId");

            var sr = await _svc.AcceptServiceRequestAsync(creatorId, convId, srId, deadlineUtc);
            var dto = new { id = sr.Id, conversationId = sr.ConversationId, status = sr.Status.ToString(), deadlineUtc = sr.CreatorDeadlineUtc };
            await Clients.Group(GroupForConversation(convId)).SendAsync("ServiceRequestUpdated", dto);
            return dto;
        }

        public async Task<object> UpdateServiceRequestDeadline(string conversationId, string serviceRequestId, DateTime newDeadlineUtc)
        {
            if (!TryGetUserId(out var creatorId)) throw new HubException("Unauthorized");
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");
            if (!Guid.TryParse(serviceRequestId, out var srId)) throw new HubException("Invalid serviceRequestId");

            var sr = await _svc.UpdateServiceRequestDeadlineAsync(creatorId, convId, srId, newDeadlineUtc);
            var dto = new { id = sr.Id, conversationId = sr.ConversationId, status = sr.Status.ToString(), deadlineUtc = sr.CreatorDeadlineUtc };
            await Clients.Group(GroupForConversation(convId)).SendAsync("ServiceRequestUpdated", dto);
            return dto;
        }

        public async Task<object> ConfirmServiceRequest(string conversationId, string serviceRequestId)
        {
            if (!TryGetUserId(out var customerId)) throw new HubException("Unauthorized");
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");
            if (!Guid.TryParse(serviceRequestId, out var srId)) throw new HubException("Invalid serviceRequestId");

            var sr = await _svc.ConfirmServiceRequestAsync(customerId, convId, srId);
            var dto = new { id = sr.Id, conversationId = sr.ConversationId, status = sr.Status.ToString() };
            await Clients.Group(GroupForConversation(convId)).SendAsync("ServiceRequestUpdated", dto);
            return dto;
        }

        public async Task<object> DeliverProduct(string conversationId, string? serviceRequestId, string productId, decimal price)
        {
            if (!TryGetUserId(out var creatorId)) throw new HubException("Unauthorized");
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");
            Guid? srId = null;
            if (!string.IsNullOrWhiteSpace(serviceRequestId))
            {
                if (!Guid.TryParse(serviceRequestId, out var parsed)) throw new HubException("Invalid serviceRequestId");
                srId = parsed;
            }
            if (!int.TryParse(productId, out var productIdInt)) throw new HubException("Invalid productId");

            var delivery = await _svc.DeliverProductAsync(creatorId, convId, srId, productIdInt, price);
            var dto = new { id = delivery.Id, conversationId = delivery.ConversationId, serviceRequestId = delivery.ServiceRequestId, productId = delivery.ProductId, price = delivery.Price, status = delivery.Status.ToString(), createdAt = delivery.CreatedAt };
            await Clients.Group(GroupForConversation(convId)).SendAsync("DeliveryUpdated", dto);
            return dto;
        }

        public async Task<object> MarkDeliveryPurchased(string conversationId, string deliveryId)
        {
            if (!TryGetUserId(out var customerId)) throw new HubException("Unauthorized");
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");
            if (!Guid.TryParse(deliveryId, out var dId)) throw new HubException("Invalid deliveryId");

            var delivery = await _svc.MarkDeliveryPurchasedAsync(customerId, convId, dId);
            var dto = new { id = delivery.Id, conversationId = delivery.ConversationId, status = delivery.Status.ToString() };
            await Clients.Group(GroupForConversation(convId)).SendAsync("DeliveryUpdated", dto);
            return dto;
        }

        public Task<int[]> GetOnlineUsers()
        {
            // Returns user IDs currently online
            var list = _onlineCounts.Keys.ToArray();
            return Task.FromResult(list);
        }

        private static string GroupForConversation(Guid id) => $"conv:{id}";

        private bool TryGetUserId(out int userId)
        {
            userId = 0;
            var str = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? Context.User?.FindFirst("nameid")?.Value
                ?? Context.User?.FindFirst("sub")?.Value
                ?? Context.User?.FindFirst("id")?.Value;
            return int.TryParse(str, out userId);
        }
    }
}
