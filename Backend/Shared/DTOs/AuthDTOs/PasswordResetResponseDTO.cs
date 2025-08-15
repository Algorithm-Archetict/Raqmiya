namespace Shared.DTOs.AuthDTOs
{
    public class PasswordResetResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class ForgotPasswordResponseDTO : PasswordResetResponseDTO
    {
        public bool EmailSent { get; set; }
    }

    public class VerifyTokenResponseDTO : PasswordResetResponseDTO
    {
        public bool IsValid { get; set; }
        public bool IsExpired { get; set; }
    }
}
