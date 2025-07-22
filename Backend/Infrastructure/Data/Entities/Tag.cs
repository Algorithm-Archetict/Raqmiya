namespace Raqmiya.Infrastructure
{
    public class Tag
    {
        public int Id { get; set; } // Primary Key
        public string Name { get; set; } = string.Empty;

        // Navigation properties for join tables
        public ICollection<CategoryTag> CategoryTags { get; set; } = new List<CategoryTag>();
        public ICollection<ProductTag> ProductTags { get; set; } = new List<ProductTag>();
    }
}
