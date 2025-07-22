using Raqmiya.Infrastructure;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure
{
    // midas added
    public class OrderItem
    {
        [Key] // Denotes this property as the primary key
        public int Id { get; set; }

        public int OrderId { get; set; }
        public Order Order { get; set; } // Navigation property to the parent Order

        public int ProductId { get; set; }
        public Product Product { get; set; } // Navigation property to the Product purchased

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
        public int Quantity { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0.")]
        public decimal UnitPrice { get; set; } // Price of the product at the time of purchase

        [StringLength(250)]
        public string ProductNameSnapshot { get; set; } // Snapshot for historical accuracy

        [StringLength(20)]
        public string CurrencySnapshot { get; set; } // Snapshot for historical accuracy

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // Automatically set on creation

        public DateTime? UpdatedAt { get; set; } // Nullable, set on update

        // Calculated Total Price for this item (NotMapped)
        [NotMapped]
        public decimal TotalPrice => Quantity * UnitPrice;
    }
}

