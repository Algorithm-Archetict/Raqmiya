using Core.Interfaces;
using Raqmiya.Infrastructure;
using Raqmiya.Infrastructure.Data.Repositories.Interfaces;

namespace Core.Services
{
    public class MessagingService : IMessagingService
    {
        private readonly IConversationRepository _conversations;
        private readonly IMessageRepository _messages;
        private readonly IMessageRequestRepository _messageRequests;
        private readonly IServiceRequestRepository _serviceRequests;
        private readonly IDeliveryRepository _deliveries;
        private readonly IServiceRequestDeadlineChangeRepository _deadlineChanges;
        private readonly IProductRepository _products;

        public MessagingService(
            IConversationRepository conversations,
            IMessageRepository messages,
            IMessageRequestRepository messageRequests,
            IServiceRequestRepository serviceRequests,
            IDeliveryRepository deliveries,
            IServiceRequestDeadlineChangeRepository deadlineChanges,
            IProductRepository products)
        {
            _conversations = conversations;
            _messages = messages;
            _messageRequests = messageRequests;
            _serviceRequests = serviceRequests;
            _deliveries = deliveries;
            _deadlineChanges = deadlineChanges;
            _products = products;
        }

        public async Task<(Conversation conversation, MessageRequest request)> CreateMessageRequestAsync(int customerId, int creatorId, string firstMessageText)
        {
            if (customerId == creatorId) throw new InvalidOperationException("Cannot message yourself.");

            var existing = await _conversations.GetPendingOrActiveAsync(creatorId, customerId);
            if (existing != null) throw new InvalidOperationException("A pending or active conversation already exists.");

            var conv = new Conversation
            {
                CreatorId = creatorId,
                CustomerId = customerId,
                Status = ConversationStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            var request = new MessageRequest
            {
                Conversation = conv,
                RequestedByCustomerId = customerId,
                FirstMessageText = firstMessageText,
                Status = MessageRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            await _conversations.AddAsync(conv);
            await _messageRequests.AddAsync(request);
            await _conversations.SaveChangesAsync();
            return (conv, request);
        }

        public async Task<(Conversation conversation, Message? firstMessage)> RespondToMessageRequestAsync(int creatorId, Guid conversationId, bool accept)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (conv.CreatorId != creatorId) throw new UnauthorizedAccessException("Only the creator can respond.");
            if (conv.Status != ConversationStatus.Pending) throw new InvalidOperationException("Conversation is not pending.");

            // Load the message request if any
            var req = await _messageRequests.GetByConversationAsync(conversationId);

            if (accept)
            {
                conv.Status = ConversationStatus.Active;
                if (req != null)
                {
                    req.Status = MessageRequestStatus.Accepted;
                    // Persist request status if repository uses its own unit of work
                    await _messageRequests.SaveChangesAsync();
                }
                // create the initial message from request, authored by the requesting customer
                Message? firstMessage = null;
                if (req != null && !string.IsNullOrWhiteSpace(req.FirstMessageText))
                {
                    firstMessage = new Message
                    {
                        ConversationId = conv.Id,
                        SenderId = req.RequestedByCustomerId,
                        Body = req.FirstMessageText!,
                        Type = MessageType.Text,
                        CreatedAt = DateTime.UtcNow
                    };
                    conv.LastMessageAt = firstMessage.CreatedAt;
                    await _messages.AddAsync(firstMessage);
                    // Persist the new message using the message repository's unit of work
                    await _messages.SaveChangesAsync();
                }
                // Persist conversation status/lastMessageAt updates
                await _conversations.SaveChangesAsync();
                return (conv, firstMessage);
            }
            else
            {
                // Decline -> hard delete conversation and its message request
                if (req != null)
                {
                    req.Status = MessageRequestStatus.Declined; // optional bookkeeping prior to delete
                    _messageRequests.Remove(req);
                }
                _conversations.Remove(conv);
                await _conversations.SaveChangesAsync();
                // Return the (now deleted) conv instance for caller to access ids
                return (conv, null);
            }
        }

        public async Task<Message> SendMessageAsync(int senderId, Guid conversationId, string text)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (conv.Status != ConversationStatus.Active) throw new InvalidOperationException("Conversation not active.");
            if (senderId != conv.CreatorId && senderId != conv.CustomerId) throw new UnauthorizedAccessException("Not a participant.");

            var msg = new Message
            {
                ConversationId = conversationId,
                SenderId = senderId,
                Body = text,
                Type = MessageType.Text,
                CreatedAt = DateTime.UtcNow
            };
            conv.LastMessageAt = msg.CreatedAt;
            await _messages.AddAsync(msg);
            await _messages.SaveChangesAsync();
            return msg;
        }

        public async Task<Message> SendAttachmentMessageAsync(int senderId, Guid conversationId, string? caption, string attachmentUrl, string attachmentType)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (conv.Status != ConversationStatus.Active) throw new InvalidOperationException("Conversation not active.");
            if (senderId != conv.CreatorId && senderId != conv.CustomerId) throw new UnauthorizedAccessException("Not a participant.");

            var msg = new Message
            {
                ConversationId = conversationId,
                SenderId = senderId,
                Body = string.IsNullOrWhiteSpace(caption) ? string.Empty : caption,
                Type = MessageType.Text,
                AttachmentUrl = attachmentUrl,
                AttachmentType = attachmentType,
                CreatedAt = DateTime.UtcNow
            };
            conv.LastMessageAt = msg.CreatedAt;
            await _messages.AddAsync(msg);
            await _messages.SaveChangesAsync();
            return msg;
        }

        public async Task<ServiceRequest> CreateServiceRequestAsync(int customerId, Guid conversationId, string requirements, decimal? proposedBudget, string? currency)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (conv.Status != ConversationStatus.Active) throw new InvalidOperationException("Conversation not active.");
            if (customerId != conv.CustomerId) throw new UnauthorizedAccessException("Only the customer can request a service.");

            var req = new ServiceRequest
            {
                ConversationId = conversationId,
                RequestedByCustomerId = customerId,
                Requirements = requirements,
                ProposedBudget = proposedBudget,
                Currency = string.IsNullOrWhiteSpace(currency) ? "USD" : currency,
                Status = ServiceRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            await _serviceRequests.AddAsync(req);
            await _serviceRequests.SaveChangesAsync();
            return req;
        }

        public async Task<ServiceRequest> AcceptServiceRequestAsync(int creatorId, Guid conversationId, Guid serviceRequestId, DateTime deadlineUtc)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (creatorId != conv.CreatorId) throw new UnauthorizedAccessException("Only the creator can accept.");
            var req = await _serviceRequests.GetByIdAsync(serviceRequestId) ?? throw new KeyNotFoundException("Service request not found.");
            if (req.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");

            req.Status = ServiceRequestStatus.AcceptedByCreator;
            req.CreatorDeadlineUtc = deadlineUtc;
            await _serviceRequests.SaveChangesAsync();
            return req;
        }

        public async Task<ServiceRequest> ConfirmServiceRequestAsync(int customerId, Guid conversationId, Guid serviceRequestId)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (conv.CustomerId != customerId) throw new UnauthorizedAccessException("Only the customer can confirm.");
            var req = await _serviceRequests.GetByIdAsync(serviceRequestId) ?? throw new KeyNotFoundException("Service request not found.");
            if (req.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");
            if (req.Status != ServiceRequestStatus.AcceptedByCreator) throw new InvalidOperationException("Only accepted requests can be confirmed.");
            req.Status = ServiceRequestStatus.ConfirmedByCustomer;
            await _serviceRequests.SaveChangesAsync();
            return req;
        }

        public async Task DeclineServiceRequestAsync(int userId, Guid conversationId, Guid serviceRequestId)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (userId != conv.CreatorId && userId != conv.CustomerId) throw new UnauthorizedAccessException("Not a participant.");
            var req = await _serviceRequests.GetByIdAsync(serviceRequestId) ?? throw new KeyNotFoundException("Service request not found.");
            if (req.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");

            // Validate who can decline at which stage
            switch (req.Status)
            {
                case ServiceRequestStatus.Pending:
                    if (userId != conv.CreatorId) throw new UnauthorizedAccessException("Only the creator can decline a pending request.");
                    break;
                case ServiceRequestStatus.AcceptedByCreator:
                    if (userId != conv.CustomerId) throw new UnauthorizedAccessException("Only the customer can decline after creator acceptance.");
                    break;
                case ServiceRequestStatus.ConfirmedByCustomer:
                    throw new InvalidOperationException("Confirmed requests cannot be declined.");
                default:
                    break;
            }

            // Prevent removal if a purchased delivery exists (shouldn't for non-confirmed, but defensive)
            var purchased = await _deliveries.GetPurchasedForServiceRequestAsync(serviceRequestId);
            if (purchased != null)
                throw new InvalidOperationException("Cannot decline a request with a purchased delivery.");

            _serviceRequests.Remove(req);
            await _serviceRequests.SaveChangesAsync();
        }

        public async Task<ServiceRequest> UpdateServiceRequestDeadlineAsync(int creatorId, Guid conversationId, Guid serviceRequestId, DateTime newDeadlineUtc)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (conv.CreatorId != creatorId) throw new UnauthorizedAccessException("Only the creator can update the deadline.");
            var req = await _serviceRequests.GetByIdAsync(serviceRequestId) ?? throw new KeyNotFoundException("Service request not found.");
            if (req.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");
            if (req.Status != ServiceRequestStatus.AcceptedByCreator && req.Status != ServiceRequestStatus.ConfirmedByCustomer)
                throw new InvalidOperationException("Only accepted or confirmed requests can be extended.");
            if (newDeadlineUtc <= DateTime.UtcNow) throw new InvalidOperationException("Deadline must be in the future.");
            req.CreatorDeadlineUtc = newDeadlineUtc;
            await _serviceRequests.SaveChangesAsync();
            return req;
        }

        public Task<List<Message>> GetMessagesAsync(Guid conversationId, int take = 50, int skip = 0)
        {
            return _messages.GetByConversationAsync(conversationId, take, skip);
        }

        public Task<List<Conversation>> GetConversationsForUserAsync(int userId, int take = 50, int skip = 0)
        {
            return _conversations.GetForUserAsync(userId, take, skip);
        }

        public Task<List<MessageRequest>> GetPendingRequestsForCreatorAsync(int creatorId, int take = 50, int skip = 0)
        {
            return _messageRequests.GetPendingForCreatorAsync(creatorId, take, skip);
        }

        public Task<List<MessageRequest>> GetPendingRequestsForCustomerAsync(int customerId, int take = 50, int skip = 0)
        {
            return _messageRequests.GetPendingForCustomerAsync(customerId, take, skip);
        }

        public async Task<Delivery> DeliverProductAsync(int creatorId, Guid conversationId, Guid? serviceRequestId, int productId, decimal price)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (creatorId != conv.CreatorId) throw new UnauthorizedAccessException("Only the creator can deliver.");
            ServiceRequest? sr = null;
            if (serviceRequestId.HasValue)
            {
                sr = await _serviceRequests.GetByIdAsync(serviceRequestId.Value) ?? throw new KeyNotFoundException("Service request not found.");
                if (sr.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");
                if (sr.Status != ServiceRequestStatus.ConfirmedByCustomer)
                    throw new InvalidOperationException("Delivery is only allowed after the customer confirms the service request.");
            }

            var delivery = new Delivery
            {
                ConversationId = conversationId,
                ServiceRequestId = serviceRequestId,
                ProductId = productId,
                Price = price,
                Status = DeliveryStatus.AwaitingPurchase,
                CreatedAt = DateTime.UtcNow
            };
            await _deliveries.AddAsync(delivery);
            await _deliveries.SaveChangesAsync();
            return delivery;
        }

        public async Task<Delivery> MarkDeliveryPurchasedAsync(int customerId, Guid conversationId, Guid deliveryId)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (customerId != conv.CustomerId) throw new UnauthorizedAccessException("Only the customer can mark purchased.");
            var delivery = await _deliveries.GetByIdAsync(deliveryId) ?? throw new KeyNotFoundException("Delivery not found.");
            if (delivery.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");
            delivery.Status = DeliveryStatus.Purchased;
            await _deliveries.SaveChangesAsync();
            return delivery;
        }

        public Task<List<ServiceRequest>> GetServiceRequestsForCreatorAsync(int creatorId, ServiceRequestStatus[] statuses, int take = 50, int skip = 0)
        {
            return _serviceRequests.GetForCreatorAsync(creatorId, statuses, take, skip);
        }

        public Task<List<ServiceRequest>> GetServiceRequestsForCustomerAsync(int customerId, ServiceRequestStatus[] statuses, int take = 50, int skip = 0)
        {
            return _serviceRequests.GetForCustomerAsync(customerId, statuses, take, skip);
        }

        public async Task<ServiceRequestDeadlineChange> ProposeDeadlineChangeAsync(int creatorId, Guid conversationId, Guid serviceRequestId, DateTime proposedDeadlineUtc, string? reason)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (conv.CreatorId != creatorId) throw new UnauthorizedAccessException("Only the creator can propose a deadline.");
            var req = await _serviceRequests.GetByIdAsync(serviceRequestId) ?? throw new KeyNotFoundException("Service request not found.");
            if (req.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");
            if (req.Status != ServiceRequestStatus.AcceptedByCreator && req.Status != ServiceRequestStatus.ConfirmedByCustomer)
                throw new InvalidOperationException("Only accepted or confirmed requests can have deadline changes.");
            if (proposedDeadlineUtc <= DateTime.UtcNow) throw new InvalidOperationException("Deadline must be in the future.");

            var existing = await _deadlineChanges.GetPendingByServiceRequestAsync(serviceRequestId);
            if (existing != null) return existing; // idempotent: return existing pending proposal

            var change = new ServiceRequestDeadlineChange
            {
                ServiceRequestId = serviceRequestId,
                ProposedByCreatorId = creatorId,
                ProposedDeadlineUtc = proposedDeadlineUtc,
                Reason = string.IsNullOrWhiteSpace(reason) ? null : reason,
                Status = DeadlineChangeStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            await _deadlineChanges.AddAsync(change);
            await _deadlineChanges.SaveChangesAsync();
            return change;
        }

        public async Task<ServiceRequest> RespondToDeadlineChangeAsync(int customerId, Guid conversationId, Guid serviceRequestId, Guid proposalId, bool accept)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (conv.CustomerId != customerId) throw new UnauthorizedAccessException("Only the customer can respond to a proposal.");
            var req = await _serviceRequests.GetByIdAsync(serviceRequestId) ?? throw new KeyNotFoundException("Service request not found.");
            if (req.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");
            var proposal = await _deadlineChanges.GetByIdAsync(proposalId) ?? throw new KeyNotFoundException("Proposal not found.");
            if (proposal.ServiceRequestId != serviceRequestId) throw new InvalidOperationException("Mismatched service request.");
            if (proposal.Status != DeadlineChangeStatus.Pending) throw new InvalidOperationException("Proposal is not pending.");

            if (accept)
            {
                proposal.Status = DeadlineChangeStatus.Accepted;
                req.CreatorDeadlineUtc = proposal.ProposedDeadlineUtc;
            }
            else
            {
                proposal.Status = DeadlineChangeStatus.Declined;
            }
            await _deadlineChanges.SaveChangesAsync();
            await _serviceRequests.SaveChangesAsync();
            return req;
        }

        public Task<List<Delivery>> GetCompletedDeliveriesForCreatorAsync(int creatorId, int take = 50, int skip = 0)
        {
            return _deliveries.GetCompletedForCreatorAsync(creatorId, take, skip);
        }

        public async Task<Delivery> CreateAndDeliverPrivateProductAsync(
            int creatorId,
            Guid conversationId,
            Guid serviceRequestId,
            string name,
            string description,
            decimal price,
            string currency,
            int categoryId,
            string? coverImageUrl,
            string? thumbnailImageUrl,
            string? previewVideoUrl,
            string? features,
            string? compatibility,
            string? license,
            string? updates)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (creatorId != conv.CreatorId) throw new UnauthorizedAccessException("Only the creator can deliver.");
            var sr = await _serviceRequests.GetByIdAsync(serviceRequestId) ?? throw new KeyNotFoundException("Service request not found.");
            if (sr.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");
            if (sr.Status != ServiceRequestStatus.ConfirmedByCustomer)
                throw new InvalidOperationException("Delivery is only allowed after the customer confirms the service request.");

            // Generate permalink
            string Slugify(string input)
            {
                var s = new string(input.ToLowerInvariant().Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray());
                while (s.Contains("--")) s = s.Replace("--", "-");
                return s.Trim('-');
            }
            var baseSlug = Slugify(name);
            var permalink = baseSlug;
            int suffix = 0;
            while (string.IsNullOrWhiteSpace(permalink) || await _products.PermalinkExistsAsync(permalink))
            {
                suffix++;
                permalink = $"{baseSlug}-{suffix}-{Guid.NewGuid():N}";
            }

            var product = new Product
            {
                CreatorId = creatorId,
                Name = name,
                Description = description,
                Price = price,
                Currency = currency,
                CoverImageUrl = coverImageUrl,
                ThumbnailImageUrl = thumbnailImageUrl,
                PreviewVideoUrl = previewVideoUrl,
                PublishedAt = null,
                Status = "unlisted",
                IsPublic = false,
                Permalink = permalink,
                Features = features,
                Compatibility = compatibility,
                License = license,
                Updates = updates,
                CategoryId = categoryId
            };
            await _products.AddAsync(product);

            var delivery = new Delivery
            {
                ConversationId = conversationId,
                ServiceRequestId = serviceRequestId,
                ProductId = product.Id,
                Price = price,
                Status = DeliveryStatus.AwaitingPurchase,
                CreatedAt = DateTime.UtcNow
            };
            await _deliveries.AddAsync(delivery);
            await _deliveries.SaveChangesAsync();
            return delivery;
        }

        public async Task<ServiceRequestDeadlineChange?> GetPendingDeadlineProposalAsync(int userId, Guid conversationId, Guid serviceRequestId)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (userId != conv.CreatorId && userId != conv.CustomerId) throw new UnauthorizedAccessException();
            var sr = await _serviceRequests.GetByIdAsync(serviceRequestId) ?? throw new KeyNotFoundException("Service request not found.");
            if (sr.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");
            return await _deadlineChanges.GetPendingByServiceRequestAsync(serviceRequestId);
        }

        public async Task<ServiceRequestDeadlineChange?> GetLatestDeadlineProposalAsync(int userId, Guid conversationId, Guid serviceRequestId)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (userId != conv.CreatorId && userId != conv.CustomerId) throw new UnauthorizedAccessException();
            var sr = await _serviceRequests.GetByIdAsync(serviceRequestId) ?? throw new KeyNotFoundException("Service request not found.");
            if (sr.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");
            return await _deadlineChanges.GetLatestByServiceRequestAsync(serviceRequestId);
        }

        public async Task<List<ServiceRequestDeadlineChange>> GetDeadlineProposalHistoryAsync(int userId, Guid conversationId, Guid serviceRequestId)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (userId != conv.CreatorId && userId != conv.CustomerId) throw new UnauthorizedAccessException();
            var sr = await _serviceRequests.GetByIdAsync(serviceRequestId) ?? throw new KeyNotFoundException("Service request not found.");
            if (sr.ConversationId != conversationId) throw new InvalidOperationException("Mismatched conversation.");
            return await _deadlineChanges.ListByServiceRequestAsync(serviceRequestId);
        }

        public async Task<List<Delivery>> GetDeliveriesForConversationAsync(int userId, Guid conversationId)
        {
            var conv = await _conversations.GetByIdAsync(conversationId) ?? throw new KeyNotFoundException("Conversation not found.");
            if (userId != conv.CreatorId && userId != conv.CustomerId) throw new UnauthorizedAccessException();
            return await _deliveries.GetForConversationAsync(conversationId);
        }
    }
}
