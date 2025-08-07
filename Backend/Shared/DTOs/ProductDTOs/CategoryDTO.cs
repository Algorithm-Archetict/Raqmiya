namespace Shared.DTOs.ProductDTOs
{
    public class CategoryDTO { public int Id { get; set; } public string Name { get; set; } = string.Empty; public int? ParentCategoryId { get; set; } } // Added ParentCategoryId
}
