namespace Shared.DTOs.AuthDTOs
{
    public class EmailVerificationResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool IsValid { get; set; }
        public bool IsExpired { get; set; }
        public bool IsUsed { get; set; }
    }

    public class ResendVerificationResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool EmailSent { get; set; }
    }

    public class ResendVerificationDTO
    {
        public string Email { get; set; } = string.Empty;
    }
}
