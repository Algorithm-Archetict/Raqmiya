using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Raqmiya.Infrastructure;

namespace Raqmiya.Infrastructure.Data
{
    public static class DbInitializer
    {
        private static string GenerateSalt()
        {
            byte[] saltBytes = new byte[16];
            using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
            {
                rng.GetBytes(saltBytes);
            }
            return Convert.ToBase64String(saltBytes);
        }

        private static string HashPassword(string password, string salt)
        {
            var saltBytes = Convert.FromBase64String(salt);
            using (var pbkdf2 = new System.Security.Cryptography.Rfc2898DeriveBytes(password, saltBytes, 10000, System.Security.Cryptography.HashAlgorithmName.SHA256))
            {
                byte[] hash = pbkdf2.GetBytes(32);
                return Convert.ToBase64String(hash);
            }
        }

        public static void Seed(RaqmiyaDbContext context)
        {
            context.Database.Migrate();

            // --- Users ---
            if (!context.Users.Any())
            {
                // Create properly hashed passwords for seeded users
                var adminSalt = GenerateSalt();
                var creatorSalt = GenerateSalt();
                var customerSalt = GenerateSalt();
                
                var admin = new User { 
                    Username = "admin", 
                    Email = "admin@example.com", 
                    HashedPassword = HashPassword("adminpass", adminSalt), 
                    Salt = adminSalt, 
                    Role = "Admin", 
                    CreatedAt = DateTime.UtcNow, 
                    IsActive = true 
                };
                var creator = new User { 
                    Username = "creator", 
                    Email = "creator@example.com", 
                    HashedPassword = HashPassword("creatorpass", creatorSalt), 
                    Salt = creatorSalt, 
                    Role = "Creator", 
                    CreatedAt = DateTime.UtcNow, 
                    IsActive = true 
                };
                var customer = new User { 
                    Username = "customer", 
                    Email = "customer@example.com", 
                    HashedPassword = HashPassword("customerpass", customerSalt), 
                    Salt = customerSalt, 
                    Role = "Customer", 
                    CreatedAt = DateTime.UtcNow, 
                    IsActive = true 
                };
                context.Users.AddRange(admin, creator, customer);
                context.SaveChanges();
            }

            // --- Categories ---
            if (!context.Categories.Any())
            {
                var cat1 = new Category { Name = "Ebooks" };
                var cat2 = new Category { Name = "Courses" };
                context.Categories.AddRange(cat1, cat2);
                context.SaveChanges();
            }

            // --- Tags ---
            if (!context.Tags.Any())
            {
                var tag1 = new Tag { Name = "C#" };
                var tag2 = new Tag { Name = ".NET" };
                context.Tags.AddRange(tag1, tag2);
                context.SaveChanges();
            }

            // --- Products ---
            if (!context.Products.Any())
            {
                var creator = context.Users.FirstOrDefault(u => u.Role == "Creator");
                var cat = context.Categories.First();
                var tag = context.Tags.First();
                var product1 = new Product
                {
                    Name = "Learn C# in 24 Hours",
                    Description = "A beginner's guide to C#.",
                    Price = 19.99m,
                    Currency = "USD",
                    ProductType = "digital_download",
                    CreatorId = creator.Id,
                    IsPublic = true,
                    Permalink = "learn-csharp-24h",
                    Status = "published",
                    PublishedAt = DateTime.UtcNow,
                    ProductCategories = new List<ProductCategory> { new ProductCategory { CategoryId = cat.Id } },
                    ProductTags = new List<ProductTag> { new ProductTag { TagId = tag.Id } }
                };
                context.Products.Add(product1);
                context.SaveChanges();
            }

            // --- Files ---
            if (!context.Files.Any())
            {
                var product = context.Products.First();
                context.Files.Add(new AddedFile { ProductId = product.Id, Name = "sample.pdf", FileUrl = "/uploads/products/1/sample.pdf", Size = 1024, ContentType = "application/pdf" });
                context.SaveChanges();
            }

            // --- Variants ---
            if (!context.Variants.Any())
            {
                var product = context.Products.First();
                context.Variants.Add(new Variant { ProductId = product.Id, Name = "PDF Version", PriceAdjustment = 0 });
                context.SaveChanges();
            }

            // --- Wishlist ---
            if (!context.WishlistItems.Any())
            {
                var customer = context.Users.FirstOrDefault(u => u.Role == "Customer");
                var product = context.Products.First();
                context.WishlistItems.Add(new WishlistItem { UserId = customer.Id, ProductId = product.Id, AddedAt = DateTime.UtcNow });
                context.SaveChanges();
            }

            // --- Reviews ---
            if (!context.Reviews.Any())
            {
                var customer = context.Users.FirstOrDefault(u => u.Role == "Customer");
                var product = context.Products.First();
                context.Reviews.Add(new Review { ProductId = product.Id, UserId = customer.Id, Rating = 5, Comment = "Great product!", CreatedAt = DateTime.UtcNow, IsApproved = true });
                context.SaveChanges();
            }

            // --- Site Settings ---
            if (!context.SiteSettings.Any())
            {
                context.SiteSettings.Add(new SiteSetting
                {
                    SiteName = "Raqmiya",
                    SupportEmail = "support@example.com",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
            }

            // --- Force update for current admin ---
            var adminUser = context.Users.FirstOrDefault(u => u.Username == "admin" || u.Email == "admin@example.com");
            if (adminUser != null)
            {
                var newAdminPassword = "Admin123!"; // Set your desired admin password here
                var newSalt = GenerateSalt();
                var newHash = HashPassword(newAdminPassword, newSalt); // Now PBKDF2
                adminUser.Salt = newSalt;
                adminUser.HashedPassword = newHash;
                adminUser.IsActive = true;
                context.SaveChanges();
            }
        }
    }
}
