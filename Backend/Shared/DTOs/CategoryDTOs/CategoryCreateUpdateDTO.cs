using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs.CategoryDTOs
{
    public class CategoryCreateUpdateDTO
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        public int? ParentCategoryId { get; set; }
    }

    // CategoryDTO is already defined in ProductDTOs.cs, can move it here if preferred.
    // For simplicity, keeping it centralized if it's identical.
}
