using System;

namespace Shared.DTOs.ProductDTOs
{
    public class ReceiptDTO
    {
        public int OrderId { get; set; }
        public DateTime PurchaseDate { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string ProductTitle { get; set; } = string.Empty;
        public string ProductThumbnail { get; set; } = string.Empty;
        public string CreatorName { get; set; } = string.Empty;
        public string LicenseKey { get; set; } = string.Empty;
        public int ProductId { get; set; }
    }
}
