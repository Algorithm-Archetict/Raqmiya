namespace Shared.DTOs.ProductDTOs
{
    public class ProductModerationRequestDTO
    {
        public string Action { get; set; } = string.Empty; // "approve" or "reject"
        public string? Reason { get; set; } // Optional, required for rejection
    }
}
