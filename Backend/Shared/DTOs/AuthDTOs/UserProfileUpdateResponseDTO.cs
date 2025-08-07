using System;

namespace Shared.DTOs.AuthDTOs
{
    public class UserProfileUpdateResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public UserProfileDTO? User { get; set; }
    }
}
