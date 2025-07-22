// Gumroad.Infrastructure/Data/EcommerceDbContext.cs
//using Gumroad.Infrastructure.Data.Entities;
using Infrastructure;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Reflection.Emit;

namespace Raqmiya.Infrastructure
{
    public class RaqmiyaDbContext : DbContext
    {
        public RaqmiyaDbContext(DbContextOptions<RaqmiyaDbContext> options) : base(options) { }

        // DbSets for your entities
        public DbSet<Product> Products { get; set; } = default!;
        public DbSet<User> Users { get; set; } = default!;
        public DbSet<Category> Categories { get; set; } = default!;
        public DbSet<Tag> Tags { get; set; } = default!;
        public DbSet<Review> Reviews { get; set; } = default!;
        public DbSet<WishlistItem> WishlistItems { get; set; } = default!;
        public DbSet<ProductView> ProductViews { get; set; } = default!;
        public DbSet<ProductCategory> ProductCategories { get; set; } = default!;
        public DbSet<ProductTag> ProductTags { get; set; } = default!;
        public DbSet<AddedFile> Files { get; set; } = default!; // Renamed if conflict with System.IO.File
        public DbSet<Variant> Variants { get; set; } = default!;
        public DbSet<OfferCode> OfferCodes { get; set; } = default!;
        public DbSet<Order> Orders { get; set; } = default!;
        public DbSet<OrderItem> OrderItems { get; set; } = default!;


        //i added
        public DbSet<License> Licenses { get; set; } = null!;
        public DbSet<Subscription> Subscriptions { get; set; } = null!;
        public DbSet<Post> Posts { get; set; } = null!;
        // public DbSet<ProductCategory> ProductCategories { get; set; } = null!;
        public DbSet<CategoryTag> CategoryTags { get; set; } = null!;
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure composite primary keys for join tables
            modelBuilder.Entity<ProductCategory>()
                .HasKey(pc => new { pc.ProductId, pc.CategoryId });

            modelBuilder.Entity<ProductTag>()
                .HasKey(pt => new { pt.ProductId, pt.TagId });

            modelBuilder.Entity<WishlistItem>()
                .HasKey(wi => new { wi.UserId, wi.ProductId });

            // Configure relationships
            modelBuilder.Entity<Product>()
                .HasOne(p => p.Creator)
                .WithMany(u => u.Products)
                .HasForeignKey(p => p.CreatorId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent cascading delete if creator has products

            modelBuilder.Entity<Review>()
                .HasOne(r => r.User)
                .WithMany(u => u.Reviews)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.Product)
                .WithMany(p => p.Reviews)
                .HasForeignKey(r => r.ProductId)
                .OnDelete(DeleteBehavior.Cascade); // Reviews are deleted with product

            modelBuilder.Entity<WishlistItem>()
                .HasOne(wi => wi.User)
                .WithMany(u => u.WishlistItems)
                .HasForeignKey(wi => wi.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WishlistItem>()
                .HasOne(wi => wi.Product)
                .WithMany(p => p.WishlistItems)
                .HasForeignKey(wi => wi.ProductId)
                .OnDelete(DeleteBehavior.Cascade); // Wishlist items are deleted with product

            modelBuilder.Entity<ProductView>()
                .HasOne(pv => pv.Product)
                .WithMany(p => p.ProductViews)
                .HasForeignKey(pv => pv.ProductId)
                .OnDelete(DeleteBehavior.Cascade); // Views are deleted with product

            modelBuilder.Entity<ProductCategory>()
                .HasOne(pc => pc.Product)
                .WithMany(p => p.ProductCategories)
                .HasForeignKey(pc => pc.ProductId)
                .OnDelete(DeleteBehavior.Cascade); // Join entry deleted with product

            modelBuilder.Entity<ProductCategory>()
                .HasOne(pc => pc.Category)
                .WithMany(c => c.ProductCategories)
                .HasForeignKey(pc => pc.CategoryId)
                .OnDelete(DeleteBehavior.Restrict); // Keep category if products reference it

            modelBuilder.Entity<ProductTag>()
                .HasOne(pt => pt.Product)
                .WithMany(p => p.ProductTags)
                .HasForeignKey(pt => pt.ProductId)
                .OnDelete(DeleteBehavior.Cascade); // Join entry deleted with product

            modelBuilder.Entity<ProductTag>()
                .HasOne(pt => pt.Tag)
                .WithMany(t => t.ProductTags)
                .HasForeignKey(pt => pt.TagId)
                .OnDelete(DeleteBehavior.Restrict); // Keep tag if products reference it

            // Configure Category hierarchy (ParentCategoryId)
            modelBuilder.Entity<Category>()
                .HasOne(c => c.ParentCategory)
                .WithMany(c => c.Subcategories)
                .HasForeignKey(c => c.ParentCategoryId)
                .IsRequired(false) // ParentCategoryId can be NULL for top-level categories
                .OnDelete(DeleteBehavior.Restrict); // Prevent cascading delete of parent if subcategories exist


            // midas updated
            // Order and OrderItem relationships
            //modelBuilder.Entity<Order>()
            //    .HasOne(o => o.Buyer)
            //    .WithMany(u => u.Orders)
            //    .HasForeignKey(o => o.BuyerId)
            //    .OnDelete(DeleteBehavior.Restrict);

            //modelBuilder.Entity<OrderItem>()
            //    .HasOne(oi => oi.Order)
            //    .WithMany(o => o.OrderItems)
            //    .HasForeignKey(oi => oi.OrderId)
            //    .OnDelete(DeleteBehavior.Cascade);

            //modelBuilder.Entity<OrderItem>()
            //    .HasOne(oi => oi.Product)
            //    .WithMany(p => p.Orders) // Renamed for clarity: Product has many OrderItems not Orders directly
            //    .HasForeignKey(oi => oi.ProductId)
            //    .OnDelete(DeleteBehavior.Restrict); // Product should not be deleted if it has order items

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Buyer)
                .WithMany(u => u.Orders)
                .HasForeignKey(o => o.BuyerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Order)
                .WithMany(o => o.OrderItems) // This line refers to the Order.OrderItems navigation property
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Product)
                .WithMany(p => p.OrderItems) // Corrected: Product has many OrderItems
                .HasForeignKey(oi => oi.ProductId)
                .OnDelete(DeleteBehavior.Restrict);



            // Configure User table with Salt
            modelBuilder.Entity<User>(entity =>
            {
                entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
                entity.HasIndex(e => e.Email).IsUnique(); // Ensure unique email

                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.Username).IsUnique(); // Ensure unique username

                entity.Property(e => e.HashedPassword).IsRequired();
                entity.Property(e => e.Salt).IsRequired().HasMaxLength(256); // Or appropriate length for your salt
                entity.Property(e => e.Role).IsRequired().HasMaxLength(50); // e.g., "Creator", "Buyer", "Admin"
            });

            // Configure Product table with Permalink uniqueness
            modelBuilder.Entity<Product>(entity =>
            {
                entity.HasIndex(e => e.Permalink).IsUnique();
            });

            // Ensure other entity configurations (e.g., string lengths) are present.
            // Example for `File` table to avoid conflict with System.IO.File
            modelBuilder.Entity<AddedFile>(entity =>
            {
                entity.ToTable("Files"); // Explicitly map to "Files" table
            });
        }
    }
}