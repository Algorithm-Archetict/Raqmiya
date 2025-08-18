using Raqmiya.Infrastructure;

namespace Core.Interfaces
{
    public interface IMessagingService
    {
        Task<(Conversation conversation, MessageRequest request)> CreateMessageRequestAsync(int customerId, int creatorId, string firstMessageText);
        Task<(Conversation conversation, Message? firstMessage)> RespondToMessageRequestAsync(int creatorId, Guid conversationId, bool accept);
        Task<Message> SendMessageAsync(int senderId, Guid conversationId, string text);
        Task<Message> SendAttachmentMessageAsync(int senderId, Guid conversationId, string? caption, string attachmentUrl, string attachmentType);
        Task<List<Message>> GetMessagesAsync(Guid conversationId, int take = 50, int skip = 0);

        Task<List<Conversation>> GetConversationsForUserAsync(int userId, int take = 50, int skip = 0);
        Task<List<MessageRequest>> GetPendingRequestsForCreatorAsync(int creatorId, int take = 50, int skip = 0);
        Task<List<MessageRequest>> GetPendingRequestsForCustomerAsync(int customerId, int take = 50, int skip = 0);

        Task<ServiceRequest> CreateServiceRequestAsync(int customerId, Guid conversationId, string requirements, decimal? proposedBudget, string? currency);
        Task<ServiceRequest> AcceptServiceRequestAsync(int creatorId, Guid conversationId, Guid serviceRequestId, DateTime deadlineUtc);
        Task<ServiceRequest> ConfirmServiceRequestAsync(int customerId, Guid conversationId, Guid serviceRequestId);
        Task<ServiceRequest> UpdateServiceRequestDeadlineAsync(int creatorId, Guid conversationId, Guid serviceRequestId, DateTime newDeadlineUtc);

        Task<Delivery> DeliverProductAsync(int creatorId, Guid conversationId, Guid? serviceRequestId, int productId, decimal price);
        Task<Delivery> MarkDeliveryPurchasedAsync(int customerId, Guid conversationId, Guid deliveryId);

        Task<List<ServiceRequest>> GetServiceRequestsForCreatorAsync(int creatorId, ServiceRequestStatus[] statuses, int take = 50, int skip = 0);
        Task<List<ServiceRequest>> GetServiceRequestsForCustomerAsync(int customerId, ServiceRequestStatus[] statuses, int take = 50, int skip = 0);

        // Deadline proposal flow
        Task<ServiceRequestDeadlineChange> ProposeDeadlineChangeAsync(int creatorId, Guid conversationId, Guid serviceRequestId, DateTime proposedDeadlineUtc, string? reason);
        Task<ServiceRequest> RespondToDeadlineChangeAsync(int customerId, Guid conversationId, Guid serviceRequestId, Guid proposalId, bool accept);

        // Completed deliveries listing for creator dashboard
        Task<List<Delivery>> GetCompletedDeliveriesForCreatorAsync(int creatorId, int take = 50, int skip = 0);

        // One-shot private product creation and delivery
        Task<Delivery> CreateAndDeliverPrivateProductAsync(
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
            string? updates);

        // Fetch latest pending deadline proposal for a service request
        Task<ServiceRequestDeadlineChange?> GetPendingDeadlineProposalAsync(int userId, Guid conversationId, Guid serviceRequestId);

        // List deliveries for a conversation (for participants)
        Task<List<Delivery>> GetDeliveriesForConversationAsync(int userId, Guid conversationId);
    }
}
