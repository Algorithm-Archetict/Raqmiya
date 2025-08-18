namespace Raqmiya.Infrastructure
{
    public enum ConversationStatus
    {
        Pending = 0,
        Active = 1,
        Declined = 2,
        Blocked = 3
    }

    public enum MessageType
    {
        Text = 0,
        System = 1,
        ServiceRequest = 2,
        Delivery = 3
    }

    public enum MessageRequestStatus
    {
        Pending = 0,
        Accepted = 1,
        Declined = 2
    }

    public enum ServiceRequestStatus
    {
        Pending = 0,
        AcceptedByCreator = 1,
        ConfirmedByCustomer = 2,
        Rejected = 3
    }

    public enum DeliveryStatus
    {
        AwaitingPurchase = 0,
        Purchased = 1,
        Canceled = 2
    }
}
