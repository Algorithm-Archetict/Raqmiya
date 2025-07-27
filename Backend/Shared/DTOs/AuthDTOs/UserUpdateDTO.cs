using System.ComponentModel.DataAnnotations;

namespace Shared.DTOs.AuthDTOs
{
    public class UserUpdateDTO
    {
        [StringLength(50, MinimumLength = 3)]
        public string? Username { get; set; }

        [StringLength(500)]
        public string? ProfileDescription { get; set; }

        [Url]
        public string? ProfileImageUrl { get; set; }
    }
}
