using System.ComponentModel.DataAnnotations;

namespace Shared.DTOs.AuthDTOs
{
    public class EmailVerificationDTO
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }
}
