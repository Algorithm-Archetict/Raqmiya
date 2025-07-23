using Shared.DTOs.AuthDTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Interfaces
{
    // This interface defines the contract for authentication-related operations. (For user registration/login)
    public interface IAuthService
    {
        Task<AuthResponseDTO> RegisterAsync(RegisterRequestDTO request);
        Task<AuthResponseDTO> LoginAsync(LoginRequestDTO request);
        // Task<AuthResponseDTO> RefreshTokenAsync(string refreshToken); // For later, if implementing refresh tokens
    }
}
