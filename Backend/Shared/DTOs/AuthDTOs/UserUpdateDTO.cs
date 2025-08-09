using System.ComponentModel.DataAnnotations;

namespace Shared.DTOs.AuthDTOs
{
    public class UserUpdateDTO
    {
        [StringLength(50, MinimumLength = 3)]
        public string? Username { get; set; }

        [StringLength(500)]
        public string? ProfileDescription { get; set; }

        // Allow empty string to remove image, or valid URL up to 500 chars
        public string? ProfileImageUrl { get; set; }
    }
}
