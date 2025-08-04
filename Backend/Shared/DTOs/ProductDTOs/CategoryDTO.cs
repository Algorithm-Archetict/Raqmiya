namespace Shared.DTOs.ProductDTOs
{
    public class ProductCategoryDTO { public int Id { get; set; } public string Name { get; set; } = string.Empty; public int? ParentCategoryId { get; set; } } // Added ParentCategoryId
}
