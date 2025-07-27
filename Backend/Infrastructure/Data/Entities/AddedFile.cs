namespace Raqmiya.Infrastructure
{
    public class AddedFile 
    {
        public int Id { get; set; } // Primary Key
        public int ProductId { get; set; } // Foreign Key to Product
        public string Name { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty; // Secure, private storage URL
        public long Size { get; set; } // File size in bytes
        public string ContentType { get; set; } = string.Empty; // e.g., "application/pdf", "image/jpeg"

        // Navigation property
        public Product Product { get; set; } = null!; // Required navigation property

    }
}
