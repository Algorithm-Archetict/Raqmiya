using Shared.DTOs.OrderDTOs;
using System.Threading.Tasks;

namespace Core.Interfaces
{
    public interface IOrderService
    {
        // ...existing methods...
        Task<PaymentResultDTO> ProcessPaymentAsync(int orderId, int userId, PaymentRequestDTO paymentRequest);
    }
}

