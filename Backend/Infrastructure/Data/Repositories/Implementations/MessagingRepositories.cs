using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Raqmiya.Infrastructure;
using Raqmiya.Infrastructure.Data.Repositories.Interfaces;

namespace Raqmiya.Infrastructure.Data.Repositories.Implementations
{
    public class ConversationRepository : IConversationRepository
    {
        private readonly RaqmiyaDbContext _db;
        public ConversationRepository(RaqmiyaDbContext db) { _db = db; }
        public Task<Conversation?> GetByIdAsync(Guid id) => _db.Conversations.FirstOrDefaultAsync(c => c.Id == id);
        public Task<Conversation?> GetPendingOrActiveAsync(int creatorId, int customerId)
            => _db.Conversations
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c =>
                    c.CreatorId == creatorId &&
                    c.CustomerId == customerId &&
                    (
                        c.Status == ConversationStatus.Pending ||
                        (c.Status == ConversationStatus.Active && c.Messages.Any())
                    )
                );
        public Task<List<Conversation>> GetForUserAsync(int userId, int take = 50, int skip = 0)
            => _db.Conversations
                .Where(c => c.CreatorId == userId || c.CustomerId == userId)
                .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
                .Skip(skip).Take(take)
                .ToListAsync();
        public async Task AddAsync(Conversation conversation) { await _db.Conversations.AddAsync(conversation); }
        public void Remove(Conversation conversation) { _db.Conversations.Remove(conversation); }
        public Task SaveChangesAsync() => _db.SaveChangesAsync();
    }

    public class MessageRepository : IMessageRepository
    {
        private readonly RaqmiyaDbContext _db;
        public MessageRepository(RaqmiyaDbContext db) { _db = db; }
        public async Task AddAsync(Message message) { await _db.Messages.AddAsync(message); }
        public Task<List<Message>> GetByConversationAsync(Guid conversationId, int take = 50, int skip = 0)
            => _db.Messages.Where(m => m.ConversationId == conversationId)
                .OrderBy(m => m.CreatedAt)
                .Skip(skip).Take(take).ToListAsync();
        public Task SaveChangesAsync() => _db.SaveChangesAsync();
    }

    public class MessageRequestRepository : IMessageRequestRepository
    {
        private readonly RaqmiyaDbContext _db;
        public MessageRequestRepository(RaqmiyaDbContext db) { _db = db; }
        public async Task AddAsync(MessageRequest request) { await _db.MessageRequests.AddAsync(request); }
        public Task<MessageRequest?> GetByConversationAsync(Guid conversationId)
            => _db.MessageRequests.FirstOrDefaultAsync(r => r.ConversationId == conversationId);
        public Task<List<MessageRequest>> GetPendingForCreatorAsync(int creatorId, int take = 50, int skip = 0)
            => _db.MessageRequests
                .Where(r => r.Conversation.CreatorId == creatorId && r.Status == MessageRequestStatus.Pending)
                .OrderByDescending(r => r.CreatedAt)
                .Skip(skip).Take(take)
                .ToListAsync();
        public Task<List<MessageRequest>> GetPendingForCustomerAsync(int customerId, int take = 50, int skip = 0)
            => _db.MessageRequests
                .Where(r => r.RequestedByCustomerId == customerId && r.Status == MessageRequestStatus.Pending)
                .OrderByDescending(r => r.CreatedAt)
                .Skip(skip).Take(take)
                .ToListAsync();
        public void Remove(MessageRequest request) { _db.MessageRequests.Remove(request); }
        public Task SaveChangesAsync() => _db.SaveChangesAsync();
    }

    public class ServiceRequestRepository : IServiceRequestRepository
    {
        private readonly RaqmiyaDbContext _db;
        public ServiceRequestRepository(RaqmiyaDbContext db) { _db = db; }
        public Task<ServiceRequest?> GetByIdAsync(Guid id) => _db.ServiceRequests.FirstOrDefaultAsync(x => x.Id == id);
        public async Task AddAsync(ServiceRequest request) { await _db.ServiceRequests.AddAsync(request); }
        public Task<List<ServiceRequest>> GetForCreatorAsync(int creatorId, ServiceRequestStatus[] statuses, int take = 50, int skip = 0)
            => _db.ServiceRequests
                .Where(sr => sr.Conversation.CreatorId == creatorId && statuses.Contains(sr.Status))
                .OrderByDescending(sr => sr.CreatedAt)
                .Skip(skip).Take(take)
                .ToListAsync();
        public Task<List<ServiceRequest>> GetForCustomerAsync(int customerId, ServiceRequestStatus[] statuses, int take = 50, int skip = 0)
            => _db.ServiceRequests
                .Where(sr => sr.RequestedByCustomerId == customerId && statuses.Contains(sr.Status))
                .OrderByDescending(sr => sr.CreatedAt)
                .Skip(skip).Take(take)
                .ToListAsync();
        public Task SaveChangesAsync() => _db.SaveChangesAsync();
    }

    public class DeliveryRepository : IDeliveryRepository
    {
        private readonly RaqmiyaDbContext _db;
        public DeliveryRepository(RaqmiyaDbContext db) { _db = db; }
        public Task<Delivery?> GetByIdAsync(Guid id) => _db.Deliveries.FirstOrDefaultAsync(x => x.Id == id);
        public async Task AddAsync(Delivery delivery) { await _db.Deliveries.AddAsync(delivery); }
        public Task<List<Delivery>> GetCompletedForCreatorAsync(int creatorId, int take = 50, int skip = 0)
            => _db.Deliveries
                .Include(d => d.Conversation)
                    .ThenInclude(c => c.Customer)
                .Include(d => d.Product)
                .Where(d => d.Status == DeliveryStatus.Purchased && d.Conversation.CreatorId == creatorId)
                .OrderByDescending(d => d.CreatedAt)
                .Skip(skip).Take(take)
                .ToListAsync();
        public Task<List<Delivery>> GetForConversationAsync(Guid conversationId)
            => _db.Deliveries
                .Include(d => d.Product)
                .Where(d => d.ConversationId == conversationId)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();
        public Task<Delivery?> GetPurchasedForServiceRequestAsync(Guid serviceRequestId)
            => _db.Deliveries.FirstOrDefaultAsync(d => d.ServiceRequestId == serviceRequestId && d.Status == DeliveryStatus.Purchased);
        public Task SaveChangesAsync() => _db.SaveChangesAsync();
    }

    public class ServiceRequestDeadlineChangeRepository : IServiceRequestDeadlineChangeRepository
    {
        private readonly RaqmiyaDbContext _db;
        public ServiceRequestDeadlineChangeRepository(RaqmiyaDbContext db) { _db = db; }
        public Task<ServiceRequestDeadlineChange?> GetByIdAsync(Guid id)
            => _db.ServiceRequestDeadlineChanges.FirstOrDefaultAsync(x => x.Id == id);
        public Task<ServiceRequestDeadlineChange?> GetPendingByServiceRequestAsync(Guid serviceRequestId)
            => _db.ServiceRequestDeadlineChanges.FirstOrDefaultAsync(x => x.ServiceRequestId == serviceRequestId && x.Status == DeadlineChangeStatus.Pending);
        public async Task AddAsync(ServiceRequestDeadlineChange change) { await _db.ServiceRequestDeadlineChanges.AddAsync(change); }
        public Task SaveChangesAsync() => _db.SaveChangesAsync();
    }
}
