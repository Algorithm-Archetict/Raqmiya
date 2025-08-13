using System;
using System.Collections.Generic;
using Shared.DTOs.ProductDTOs;

namespace Shared.DTOs.OrderDTOs
{
    public class PurchasedProductDTO
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductPermalink { get; set; } = string.Empty;
        public string? CoverImageUrl { get; set; }
        public string? ThumbnailImageUrl { get; set; }
        public string CreatorUsername { get; set; } = string.Empty;
        public decimal PurchasePrice { get; set; }
        public DateTime PurchaseDate { get; set; }
        public string OrderId { get; set; } = string.Empty;
        public string LicenseStatus { get; set; } = string.Empty;
        public DateTime? LicenseExpiresAt { get; set; }
        public List<FileDTO> Files { get; set; } = new List<FileDTO>();
        public string ProductDescription { get; set; } = string.Empty;
        public string DownloadGuide { get; set; } = string.Empty;
    }
} 