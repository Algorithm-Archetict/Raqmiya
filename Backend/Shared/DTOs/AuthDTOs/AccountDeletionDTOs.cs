using System.ComponentModel.DataAnnotations;

namespace Shared.DTOs.AuthDTOs
{
    public class RequestAccountDeletionDTO
    {
        [Required]
        public string Password { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string DeletionReason { get; set; } = string.Empty;

        [Required]
        public bool ConfirmDeletion { get; set; }
    }

    public class RequestAccountDeletionResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool EmailSent { get; set; }
    }

    public class ConfirmAccountDeletionDTO
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }

    public class ConfirmAccountDeletionResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool AccountDeleted { get; set; }
        public DateTime? DeletionScheduledAt { get; set; }
    }

    public class RestoreAccountDTO
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }

    public class RestoreAccountResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool AccountRestored { get; set; }
        public string? Token { get; set; }
        public string? Username { get; set; }
        public string? Email { get; set; }
        public List<string>? Roles { get; set; }
    }

    public class CancelAccountDeletionDTO
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }

    public class CancelAccountDeletionResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool DeletionCancelled { get; set; }
    }
}
