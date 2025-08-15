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
        Task<ForgotPasswordResponseDTO> ForgotPasswordAsync(ForgotPasswordDTO request);
        Task<PasswordResetResponseDTO> ResetPasswordAsync(ResetPasswordDTO request);
        Task<VerifyTokenResponseDTO> VerifyResetTokenAsync(string token);
        Task<AuthResponseDTO> VerifyEmailAsync(EmailVerificationDTO request);
        Task<ResendVerificationResponseDTO> ResendVerificationAsync(ResendVerificationDTO request);
        
        // Account Deletion Methods
        Task<RequestAccountDeletionResponseDTO> RequestAccountDeletionAsync(RequestAccountDeletionDTO request, int userId);
        Task<ConfirmAccountDeletionResponseDTO> ConfirmAccountDeletionAsync(ConfirmAccountDeletionDTO request);
        Task<RestoreAccountResponseDTO> RestoreAccountAsync(RestoreAccountDTO request);
        Task<CancelAccountDeletionResponseDTO> CancelAccountDeletionAsync(CancelAccountDeletionDTO request);
        
        // Task<AuthResponseDTO> RefreshTokenAsync(string refreshToken); // For later, if implementing refresh tokens
    }
}
