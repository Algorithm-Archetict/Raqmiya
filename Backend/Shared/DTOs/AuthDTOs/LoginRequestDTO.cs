using System.ComponentModel.DataAnnotations;

namespace Shared.DTOs.AuthDTOs
{
    public class LoginRequestDTO
    {
        [Required]
        public string EmailOrUsername { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }
}
