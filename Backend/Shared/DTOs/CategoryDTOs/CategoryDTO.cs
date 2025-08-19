namespace Shared.DTOs.CategoryDTOs
{
    public class GeneralCategoryDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? ParentCategoryId { get; set; }
        public ICollection<GeneralCategoryDTO> Subcategories { get; set; } = new List<GeneralCategoryDTO>();
    }
}

