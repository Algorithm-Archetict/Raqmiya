namespace Raqmiya.Infrastructure
{
    public class ProductTag
    {
        public int ProductId { get; set; }
        public int TagId { get; set; }

        // Navigation properties
        public Product Product { get; set; } = null!;
        public Tag Tag { get; set; } = null!;
    }
}
