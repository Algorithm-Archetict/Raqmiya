using System.ComponentModel.DataAnnotations;

namespace Shared.DTOs.ProductDTOs
{
    public class ProductUpdateRequestDTO : ProductCreateRequestDTO
    {
        [Required(ErrorMessage = "Product ID is required for update.")]
        public int Id { get; set; }

        [Required(ErrorMessage = "Status is required.")]
        [StringLength(50, ErrorMessage = "Status cannot exceed 50 characters.")]
        public string Status { get; set; } = "draft"; // e.g., "draft", "published", "archived", "unlisted"
    }
}
