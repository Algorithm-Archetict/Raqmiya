using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs.TagDTOs
{
    public class TagCreateUpdateDTO
    {
        [Required]
        [StringLength(50, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;
    }

    // TagDTO is already defined in ProductDTOs.cs, can move it here if preferred.
    // For simplicity, keeping it centralized if it's identical.
}
