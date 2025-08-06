using Shared.DTOs.OrderDTOs;
using System.Threading.Tasks;

namespace Core.Interfaces
{
    public interface ICartService
    {
        Task<CartResponseDTO> GetUserCartAsync(int userId);
        Task<CartResponseDTO> AddToCartAsync(int userId, AddToCartRequestDTO request);
        Task<CartResponseDTO> RemoveFromCartAsync(int userId, int productId);
        Task<CartResponseDTO> UpdateCartItemAsync(int userId, UpdateCartItemRequestDTO request);
        Task<CartResponseDTO> ClearCartAsync(int userId);
    }
} 