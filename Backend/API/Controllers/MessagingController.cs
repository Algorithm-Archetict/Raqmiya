using System.Security.Claims;
using System.Linq;
using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Raqmiya.Infrastructure;
using Microsoft.AspNetCore.SignalR;
using API.Hubs;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MessagingController : ControllerBase
    {
        private readonly IMessagingService _svc;
        private readonly IWebHostEnvironment _env;
        private readonly IHubContext<ChatHub> _hub;
        public MessagingController(IMessagingService svc, IWebHostEnvironment env, IHubContext<ChatHub> hub) { _svc = svc; _env = env; _hub = hub; }

        private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? User.FindFirstValue("id")!);

        [HttpPost("requests")]
        public async Task<IActionResult> CreateMessageRequest([FromBody] CreateMessageRequestDto dto)
        {
            var (conv, req) = await _svc.CreateMessageRequestAsync(UserId, dto.CreatorId, dto.FirstMessageText);
            return Ok(new
            {
                conversation = new { id = conv.Id, creatorId = conv.CreatorId, customerId = conv.CustomerId, status = conv.Status.ToString(), createdAt = conv.CreatedAt },
                request = new { id = req.Id, status = req.Status.ToString(), firstMessageText = req.FirstMessageText, createdAt = req.CreatedAt }
            });
        }

        [HttpGet("conversations")]
        public async Task<IActionResult> GetMyConversations([FromQuery] int take = 50, [FromQuery] int skip = 0)
        {
            var list = await _svc.GetConversationsForUserAsync(UserId, take, skip);
            return Ok(list.Select(c => new { id = c.Id, creatorId = c.CreatorId, customerId = c.CustomerId, status = c.Status.ToString(), createdAt = c.CreatedAt, lastMessageAt = c.LastMessageAt }));
        }

        [HttpGet("requests/pending")]
        public async Task<IActionResult> GetPendingRequestsForCreator([FromQuery] int take = 50, [FromQuery] int skip = 0)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var items = await _svc.GetPendingRequestsForCreatorAsync(userId, take, skip);
            var dto = items.Select(r => new {
                id = r.Id,
                conversationId = r.ConversationId,
                status = r.Status.ToString(),
                firstMessageText = r.FirstMessageText,
                createdAt = r.CreatedAt
            });
            return Ok(dto);
        }

        // List deliveries for a conversation (visible to its participants)
        [HttpGet("{conversationId:guid}/deliveries")]
        public async Task<IActionResult> GetDeliveriesForConversation(Guid conversationId)
        {
            var list = await _svc.GetDeliveriesForConversationAsync(UserId, conversationId);
            var dto = list.Select(d => new
            {
                id = d.Id,
                conversationId = d.ConversationId,
                serviceRequestId = d.ServiceRequestId,
                productId = d.ProductId,
                productName = d.Product != null ? d.Product.Name : null,
                price = d.Price,
                status = d.Status.ToString(),
                createdAt = d.CreatedAt
            });
            return Ok(dto);
        }

        [HttpGet("requests/outgoing")]
        public async Task<IActionResult> GetPendingRequestsForCustomer([FromQuery] int take = 50, [FromQuery] int skip = 0)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var items = await _svc.GetPendingRequestsForCustomerAsync(userId, take, skip);
            var dto = items.Select(r => new {
                id = r.Id,
                conversationId = r.ConversationId,
                status = r.Status.ToString(),
                firstMessageText = r.FirstMessageText,
                createdAt = r.CreatedAt
            });
            return Ok(dto);
        }

        [HttpPost("requests/{conversationId:guid}/respond")]
        public async Task<IActionResult> RespondToMessageRequest(Guid conversationId, [FromBody] RespondRequestDto dto)
        {
            var result = await _svc.RespondToMessageRequestAsync(UserId, conversationId, dto.Accept);
            var conv = result.conversation;
            var payload = new { id = conv.Id, status = conv.Status.ToString(), creatorId = conv.CreatorId, customerId = conv.CustomerId };
            if (result.firstMessage != null)
            {
                var m = result.firstMessage;
                return Ok(new
                {
                    conversation = payload,
                    firstMessage = new { id = m.Id, conversationId = m.ConversationId, senderId = m.SenderId, body = m.Body, type = m.Type.ToString(), createdAt = m.CreatedAt }
                });
            }
            return Ok(payload);
        }

        [HttpPost("{conversationId:guid}/messages")]
        public async Task<IActionResult> SendMessage(Guid conversationId, [FromBody] SendMessageDto dto)
        {
            var msg = await _svc.SendMessageAsync(UserId, conversationId, dto.Text);
            return Ok(new { id = msg.Id, conversationId = msg.ConversationId, senderId = msg.SenderId, body = msg.Body, type = msg.Type.ToString(), createdAt = msg.CreatedAt, attachmentUrl = msg.AttachmentUrl, attachmentType = msg.AttachmentType });
        }

        [HttpPost("{conversationId:guid}/attachments")]
        [RequestSizeLimit(20_000_000)] // 20 MB
        public async Task<IActionResult> UploadAttachment(Guid conversationId, IFormFile file, [FromForm] string? caption = null)
        {
            try
            {
                if (file == null || file.Length == 0) return BadRequest("No file uploaded");
                // Save file to wwwroot/uploads/chat
                var uploadsPath = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "chat");
                if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);
                var safeName = string.Join("_", Path.GetFileNameWithoutExtension(file.FileName).Split(Path.GetInvalidFileNameChars())) + Path.GetExtension(file.FileName);
                var fileName = $"{conversationId}_{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{Path.GetExtension(safeName)}";
                var filePath = Path.Combine(uploadsPath, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
                var request = HttpContext.Request;
                var baseUrl = $"{request.Scheme}://{request.Host}";
                var fileUrl = $"/uploads/chat/{fileName}";
                var fullUrl = baseUrl + fileUrl;
                // Create a message with attachment fields (caption optional)
                var contentType = string.IsNullOrWhiteSpace(file.ContentType) ? "image" : file.ContentType;
                var msg = await _svc.SendAttachmentMessageAsync(UserId, conversationId, string.IsNullOrWhiteSpace(caption) ? null : caption, fullUrl, contentType);
                var payload = new { id = msg.Id, conversationId = msg.ConversationId, senderId = msg.SenderId, body = msg.Body, type = msg.Type.ToString(), createdAt = msg.CreatedAt, attachmentUrl = msg.AttachmentUrl, attachmentType = msg.AttachmentType, url = msg.AttachmentUrl };
                // Broadcast to conversation group so the recipient gets it in real-time
                await _hub.Clients.Group($"conv:{conversationId}").SendAsync("ReceiveMessage", payload);
                // Also broadcast to both participants' user groups to cover cases where a client hasn't joined the conversation group yet
                try
                {
                    // Retrieve the conversation for the current user and identify both participants
                    var myConvs = await _svc.GetConversationsForUserAsync(UserId, 200, 0);
                    var conv = myConvs.FirstOrDefault(c => c.Id == conversationId);
                    if (conv != null)
                    {
                        await _hub.Clients.Group($"user:{conv.CustomerId}").SendAsync("ReceiveMessage", payload);
                        await _hub.Clients.Group($"user:{conv.CreatorId}").SendAsync("ReceiveMessage", payload);
                    }
                }
                catch { /* best-effort broadcast to user groups */ }
                return Ok(payload);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                // log ex here if logging is available
                return StatusCode(500, new { error = "Failed to upload attachment.", details = ex.Message });
            }
        }

        [HttpGet("{conversationId:guid}/messages")]
        public async Task<IActionResult> GetMessages(Guid conversationId, [FromQuery] int take = 50, [FromQuery] int skip = 0)
        {
            var list = await _svc.GetMessagesAsync(conversationId, take, skip);
            return Ok(list.Select(msg => new { id = msg.Id, conversationId = msg.ConversationId, senderId = msg.SenderId, body = msg.Body, type = msg.Type.ToString(), createdAt = msg.CreatedAt, attachmentUrl = msg.AttachmentUrl, attachmentType = msg.AttachmentType }));
        }

        [HttpPost("{conversationId:guid}/service-requests")]
        public async Task<IActionResult> CreateServiceRequest(Guid conversationId, [FromBody] CreateServiceRequestDto dto)
        {
            var sr = await _svc.CreateServiceRequestAsync(UserId, conversationId, dto.Requirements, dto.ProposedBudget, dto.Currency);
            return Ok(new { id = sr.Id, conversationId = sr.ConversationId, requirements = sr.Requirements, proposedBudget = sr.ProposedBudget, currency = sr.Currency, status = sr.Status.ToString(), deadlineUtc = sr.CreatorDeadlineUtc });
        }

        [HttpPost("{conversationId:guid}/service-requests/{serviceRequestId:guid}/accept")]
        public async Task<IActionResult> AcceptServiceRequest(Guid conversationId, Guid serviceRequestId, [FromBody] AcceptServiceRequestDto dto)
        {
            var sr = await _svc.AcceptServiceRequestAsync(UserId, conversationId, serviceRequestId, dto.DeadlineUtc);
            return Ok(new { id = sr.Id, conversationId = sr.ConversationId, status = sr.Status.ToString(), deadlineUtc = sr.CreatorDeadlineUtc });
        }

        [HttpPost("{conversationId:guid}/service-requests/{serviceRequestId:guid}/confirm")]
        public async Task<IActionResult> ConfirmServiceRequest(Guid conversationId, Guid serviceRequestId)
        {
            var sr = await _svc.ConfirmServiceRequestAsync(UserId, conversationId, serviceRequestId);
            return Ok(new { id = sr.Id, conversationId = sr.ConversationId, status = sr.Status.ToString() });
        }

        // Creator initiates deadline update as a proposal (no immediate update)
        [HttpPost("{conversationId:guid}/service-requests/{serviceRequestId:guid}/deadline")]
        public async Task<IActionResult> UpdateServiceRequestDeadline(Guid conversationId, Guid serviceRequestId, [FromBody] UpdateDeadlineDto dto)
        {
            var prop = await _svc.ProposeDeadlineChangeAsync(UserId, conversationId, serviceRequestId, dto.NewDeadlineUtc, dto.Reason);
            var payload = new { id = prop.Id, serviceRequestId = prop.ServiceRequestId, proposedDeadlineUtc = prop.ProposedDeadlineUtc, status = prop.Status.ToString(), createdAt = prop.CreatedAt, reason = prop.Reason };
            // Broadcast real-time update to conversation group
            await _hub.Clients.Group($"conv:{conversationId}").SendAsync("DeadlineProposalUpdated", new { conversationId, serviceRequestId, proposal = payload });
            return Ok(payload);
        }

        // Two-step deadline change: propose by creator
        [HttpPost("{conversationId:guid}/service-requests/{serviceRequestId:guid}/deadline/propose")]
        public async Task<IActionResult> ProposeDeadlineChange(Guid conversationId, Guid serviceRequestId, [FromBody] ProposeDeadlineDto dto)
        {
            var prop = await _svc.ProposeDeadlineChangeAsync(UserId, conversationId, serviceRequestId, dto.ProposedDeadlineUtc, dto.Reason);
            var payload = new { id = prop.Id, serviceRequestId = prop.ServiceRequestId, proposedDeadlineUtc = prop.ProposedDeadlineUtc, status = prop.Status.ToString(), createdAt = prop.CreatedAt, reason = prop.Reason };
            await _hub.Clients.Group($"conv:{conversationId}").SendAsync("DeadlineProposalUpdated", new { conversationId, serviceRequestId, proposal = payload });
            return Ok(payload);
        }

        // Fetch latest pending deadline proposal for this service request
        [HttpGet("{conversationId:guid}/service-requests/{serviceRequestId:guid}/deadline/pending")]
        public async Task<IActionResult> GetPendingDeadlineProposal(Guid conversationId, Guid serviceRequestId)
        {
            var prop = await _svc.GetPendingDeadlineProposalAsync(UserId, conversationId, serviceRequestId);
            if (prop == null) return NoContent();
            return Ok(new { id = prop.Id, serviceRequestId = prop.ServiceRequestId, proposedDeadlineUtc = prop.ProposedDeadlineUtc, status = prop.Status.ToString(), createdAt = prop.CreatedAt, reason = prop.Reason });
        }

        // Customer responds to a deadline proposal
        [HttpPost("{conversationId:guid}/service-requests/{serviceRequestId:guid}/deadline/{proposalId:guid}/respond")]
        public async Task<IActionResult> RespondToDeadlineProposal(Guid conversationId, Guid serviceRequestId, Guid proposalId, [FromBody] RespondDeadlineDto dto)
        {
            var sr = await _svc.RespondToDeadlineChangeAsync(UserId, conversationId, serviceRequestId, proposalId, dto.Accept);
            // After response, check if any pending proposal remains
            var pending = await _svc.GetPendingDeadlineProposalAsync(UserId, conversationId, serviceRequestId);
            object? proposalPayload = pending == null ? null : new { id = pending.Id, serviceRequestId = pending.ServiceRequestId, proposedDeadlineUtc = pending.ProposedDeadlineUtc, status = pending.Status.ToString(), createdAt = pending.CreatedAt, reason = pending.Reason };
            await _hub.Clients.Group($"conv:{conversationId}").SendAsync("DeadlineProposalUpdated", new { conversationId, serviceRequestId, proposal = proposalPayload });
            return Ok(new { id = sr.Id, conversationId = sr.ConversationId, status = sr.Status.ToString(), deadlineUtc = sr.CreatorDeadlineUtc });
        }

        

        [HttpPost("{conversationId:guid}/deliveries")]
        public async Task<IActionResult> DeliverProduct(Guid conversationId, [FromBody] DeliverProductDto dto)
        {
            var delivery = await _svc.DeliverProductAsync(UserId, conversationId, dto.ServiceRequestId, dto.ProductId, dto.Price);
            return Ok(new { id = delivery.Id, conversationId = delivery.ConversationId, serviceRequestId = delivery.ServiceRequestId, productId = delivery.ProductId, price = delivery.Price, status = delivery.Status.ToString(), createdAt = delivery.CreatedAt });
        }

        // One-shot private product creation + delivery with full details
        [HttpPost("{conversationId:guid}/deliveries/private")]
        public async Task<IActionResult> CreateAndDeliverPrivateProduct(Guid conversationId, [FromBody] CreateAndDeliverPrivateProductDto dto)
        {
            var delivery = await _svc.CreateAndDeliverPrivateProductAsync(
                UserId,
                conversationId,
                dto.ServiceRequestId,
                dto.Name,
                dto.Description,
                dto.Price,
                dto.Currency,
                dto.CategoryId,
                dto.CoverImageUrl,
                dto.ThumbnailImageUrl,
                dto.PreviewVideoUrl,
                dto.Features,
                dto.Compatibility,
                dto.License,
                dto.Updates);
            return Ok(new { id = delivery.Id, conversationId = delivery.ConversationId, serviceRequestId = delivery.ServiceRequestId, productId = delivery.ProductId, price = delivery.Price, status = delivery.Status.ToString(), createdAt = delivery.CreatedAt });
        }

        [HttpPost("{conversationId:guid}/deliveries/{deliveryId:guid}/purchased")]
        public async Task<IActionResult> MarkDeliveryPurchased(Guid conversationId, Guid deliveryId)
        {
            var delivery = await _svc.MarkDeliveryPurchasedAsync(UserId, conversationId, deliveryId);
            return Ok(new { id = delivery.Id, conversationId = delivery.ConversationId, status = delivery.Status.ToString() });
        }

        // Completed deliveries listing for creator dashboard
        [HttpGet("deliveries/completed")]
        public async Task<IActionResult> GetCompletedDeliveriesForCreator([FromQuery] int take = 50, [FromQuery] int skip = 0)
        {
            var list = await _svc.GetCompletedDeliveriesForCreatorAsync(UserId, take, skip);
            var dto = list.Select(d => new
            {
                id = d.Id,
                conversationId = d.ConversationId,
                serviceRequestId = d.ServiceRequestId,
                productId = d.ProductId,
                productName = d.Product.Name,
                price = d.Price,
                status = d.Status.ToString(),
                purchasedAt = d.CreatedAt,
                customerId = d.Conversation.CustomerId,
                customerUsername = d.Conversation.Customer.Username
            });
            return Ok(dto);
        }

        // List service requests for creator filtered by statuses
        [HttpGet("service-requests/creator")]
        public async Task<IActionResult> GetServiceRequestsForCreator([FromQuery] string[] statuses, [FromQuery] int take = 50, [FromQuery] int skip = 0)
        {
            var parsed = (statuses ?? Array.Empty<string>())
                .Select(s => Enum.TryParse<ServiceRequestStatus>(s, true, out var st) ? (ServiceRequestStatus?)st : null)
                .Where(x => x.HasValue)
                .Select(x => x!.Value)
                .ToArray();
            if (parsed.Length == 0)
            {
                parsed = new[] { ServiceRequestStatus.AcceptedByCreator, ServiceRequestStatus.ConfirmedByCustomer };
            }
            var list = await _svc.GetServiceRequestsForCreatorAsync(UserId, parsed, take, skip);
            var dto = list.Select(sr => new
            {
                id = sr.Id,
                conversationId = sr.ConversationId,
                status = sr.Status.ToString(),
                requirements = sr.Requirements,
                budget = sr.ProposedBudget.HasValue ? $"{sr.ProposedBudget.Value} {sr.Currency}" : null,
                deadlineUtc = sr.CreatorDeadlineUtc,
                createdAt = sr.CreatedAt
            });
            return Ok(dto);
        }

        // List service requests for customer filtered by statuses
        [HttpGet("service-requests/customer")]
        public async Task<IActionResult> GetServiceRequestsForCustomer([FromQuery] string[] statuses, [FromQuery] int take = 50, [FromQuery] int skip = 0)
        {
            var parsed = (statuses ?? Array.Empty<string>())
                .Select(s => Enum.TryParse<ServiceRequestStatus>(s, true, out var st) ? (ServiceRequestStatus?)st : null)
                .Where(x => x.HasValue)
                .Select(x => x!.Value)
                .ToArray();
            if (parsed.Length == 0)
            {
                parsed = new[] { ServiceRequestStatus.AcceptedByCreator, ServiceRequestStatus.ConfirmedByCustomer };
            }
            var list = await _svc.GetServiceRequestsForCustomerAsync(UserId, parsed, take, skip);
            var dto = list.Select(sr => new
            {
                id = sr.Id,
                conversationId = sr.ConversationId,
                status = sr.Status.ToString(),
                requirements = sr.Requirements,
                proposedBudget = sr.ProposedBudget,
                currency = sr.Currency,
                deadlineUtc = sr.CreatorDeadlineUtc,
                createdAt = sr.CreatedAt
            });
            return Ok(dto);
        }
    }

    public record CreateMessageRequestDto(int CreatorId, string FirstMessageText);
    public record RespondRequestDto(bool Accept);
    public record SendMessageDto(string Text);
    public record CreateServiceRequestDto(string Requirements, decimal? ProposedBudget, string? Currency);
    public record AcceptServiceRequestDto(DateTime DeadlineUtc);
    public record UpdateDeadlineDto(DateTime NewDeadlineUtc, string? Reason);
    public record DeliverProductDto(Guid? ServiceRequestId, int ProductId, decimal Price);
    public record ProposeDeadlineDto(DateTime ProposedDeadlineUtc, string? Reason);
    public record RespondDeadlineDto(bool Accept);
    public record CreateAndDeliverPrivateProductDto(
        Guid ServiceRequestId,
        string Name,
        string Description,
        decimal Price,
        string Currency,
        int CategoryId,
        string? CoverImageUrl,
        string? ThumbnailImageUrl,
        string? PreviewVideoUrl,
        string? Features,
        string? Compatibility,
        string? License,
        string? Updates);
}
