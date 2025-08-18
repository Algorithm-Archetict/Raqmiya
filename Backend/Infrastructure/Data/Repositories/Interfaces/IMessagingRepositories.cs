using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using Raqmiya.Infrastructure;

namespace Raqmiya.Infrastructure.Data.Repositories.Interfaces
{
    public interface IConversationRepository
    {
        Task<Conversation?> GetByIdAsync(Guid id);
        Task<Conversation?> GetPendingOrActiveAsync(int creatorId, int customerId);
        Task<List<Conversation>> GetForUserAsync(int userId, int take = 50, int skip = 0);
        Task AddAsync(Conversation conversation);
        void Remove(Conversation conversation);
        Task SaveChangesAsync();
    }

    public interface IMessageRepository
    {
        Task AddAsync(Message message);
        Task<List<Message>> GetByConversationAsync(Guid conversationId, int take = 50, int skip = 0);
        Task SaveChangesAsync();
    }

    public interface IMessageRequestRepository
    {
        Task AddAsync(MessageRequest request);
        Task<MessageRequest?> GetByConversationAsync(Guid conversationId);
        Task<List<MessageRequest>> GetPendingForCreatorAsync(int creatorId, int take = 50, int skip = 0);
        Task<List<MessageRequest>> GetPendingForCustomerAsync(int customerId, int take = 50, int skip = 0);
        void Remove(MessageRequest request);
        Task SaveChangesAsync();
    }

    public interface IServiceRequestRepository
    {
        Task<ServiceRequest?> GetByIdAsync(Guid id);
        Task AddAsync(ServiceRequest request);
        Task<List<ServiceRequest>> GetForCreatorAsync(int creatorId, ServiceRequestStatus[] statuses, int take = 50, int skip = 0);
        Task<List<ServiceRequest>> GetForCustomerAsync(int customerId, ServiceRequestStatus[] statuses, int take = 50, int skip = 0);
        Task SaveChangesAsync();
    }

    public interface IServiceRequestDeadlineChangeRepository
    {
        Task<ServiceRequestDeadlineChange?> GetByIdAsync(Guid id);
        Task<ServiceRequestDeadlineChange?> GetPendingByServiceRequestAsync(Guid serviceRequestId);
        Task AddAsync(ServiceRequestDeadlineChange change);
        Task SaveChangesAsync();
    }

    public interface IDeliveryRepository
    {
        Task<Delivery?> GetByIdAsync(Guid id);
        Task AddAsync(Delivery delivery);
        Task<List<Delivery>> GetCompletedForCreatorAsync(int creatorId, int take = 50, int skip = 0);
        Task<List<Delivery>> GetForConversationAsync(Guid conversationId);
        Task<Delivery?> GetPurchasedForServiceRequestAsync(Guid serviceRequestId);
        Task SaveChangesAsync();
    }
}
