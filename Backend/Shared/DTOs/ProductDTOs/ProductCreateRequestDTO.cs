using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs.ProductDTOs
{
    public class ProductCreateRequestDTO
    {
        [Required(ErrorMessage = "Product name is required.")]
        [StringLength(200, MinimumLength = 3, ErrorMessage = "Product name must be between 3 and 200 characters.")]
        public string Name { get; set; } = string.Empty;

        [StringLength(5000, ErrorMessage = "Description cannot exceed 5000 characters.")]
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Price is required.")]
        [Range(0.01, 1000000.00, ErrorMessage = "Price must be greater than 0.")]
        public decimal Price { get; set; }

        [Required(ErrorMessage = "Currency is required.")]
        [StringLength(3, MinimumLength = 3, ErrorMessage = "Currency must be a 3-letter ISO code (e.g., USD).")]
        public string Currency { get; set; } = "USD"; // Default or provide options

        //[Required(ErrorMessage = "Product type is required.")]
        //[StringLength(50, ErrorMessage = "Product type cannot exceed 50 characters.")]
        //public string ProductType { get; set; } = string.Empty; // e.g., "ebook", "software", "music"

        [Url(ErrorMessage = "Invalid URL format.")]
        [StringLength(500, ErrorMessage = "Cover image URL cannot exceed 500 characters.")]
        public string? CoverImageUrl { get; set; }

        [Url(ErrorMessage = "Invalid URL format.")]
        [StringLength(500, ErrorMessage = "Thumbnail image URL cannot exceed 500 characters.")]
        public string? ThumbnailImageUrl { get; set; }

        [Url(ErrorMessage = "Invalid URL format.")]
        [StringLength(500, ErrorMessage = "Preview video URL cannot exceed 500 characters.")]
        public string? PreviewVideoUrl { get; set; }

        public bool IsPublic { get; set; } = false;

        [Required(ErrorMessage = "Permalink is required.")]
        [StringLength(200, MinimumLength = 3, ErrorMessage = "Permalink must be between 3 and 200 characters.")]
        [RegularExpression(@"^[a-z0-9]+(?:-[a-z0-9]+)*$", ErrorMessage = "Permalink must be lowercase alphanumeric with hyphens (e.g., my-awesome-product).")]
        public string Permalink { get; set; } = string.Empty;

        // NEW: Enhanced product details
        public List<string>? Features { get; set; } = new List<string>();

        [StringLength(500, ErrorMessage = "Compatibility cannot exceed 500 characters.")]
        public string? Compatibility { get; set; }

        [StringLength(100, ErrorMessage = "License cannot exceed 100 characters.")]
        public string? License { get; set; }

        [StringLength(100, ErrorMessage = "Updates cannot exceed 100 characters.")]
        public string? Updates { get; set; }

        public int CategoryId { get; set; }
        public List<int> TagIds { get; set; } = new List<int>();
    }
}
