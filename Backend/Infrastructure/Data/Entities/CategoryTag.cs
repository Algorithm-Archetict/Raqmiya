namespace Raqmiya.Infrastructure
{
    public class CategoryTag
    {
        public int CategoryId { get; set; }
        public int TagId { get; set; }

        // Navigation properties
        public Category Category { get; set; } = null!;
        public Tag Tag { get; set; } = null!;
    }
}
