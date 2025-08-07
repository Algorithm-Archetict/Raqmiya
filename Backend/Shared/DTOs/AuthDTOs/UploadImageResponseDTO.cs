namespace Shared.DTOs.AuthDTOs
{
    public class UploadImageResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
    }
}
