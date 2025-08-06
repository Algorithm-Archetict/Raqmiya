namespace Shared.DTOs.ProductDTOs
{
    public class ReviewDTO { 
        public int Id { get; set; } 
        public int Rating { get; set; } 
        public string? Comment { get; set; } 
        public string userName { get; set; } = string.Empty; 
        public DateTime CreatedAt { get; set; } 
        public string? UserAvatar { get; set; } }
}
