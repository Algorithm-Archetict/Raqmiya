namespace Raqmiya.Infrastructure
{
    public class CategoryTag
    {
        public int Id { get; set; } // Primary Key

        public int CategoryId { get; set; }
        public int TagId { get; set; }

        // Navigation properties
        public Category Category { get; set; } = null!;
        public Tag Tag { get; set; } = null!;
    }
}
