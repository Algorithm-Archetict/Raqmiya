using System.ComponentModel.DataAnnotations;

namespace Shared.DTOs.AuthDTOs
{
    public class ChangePasswordDTO
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
