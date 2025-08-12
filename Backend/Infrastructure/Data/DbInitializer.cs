
using Microsoft.EntityFrameworkCore;
// using Raqmiya.Infrastructure.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace Raqmiya.Infrastructure.Data
{
    public static class DbInitializer
    {
        private static Random _random = new Random();

        public static void Seed(RaqmiyaDbContext context)
        {
            // For a clean seed, it's often best to start from a known state.
            // WARNING: This will delete all data in the specified tables.
            ClearData(context);

            context.Database.Migrate();

            // --- 1. Seed Users ---
            var users = SeedUsers(context, "Pass12345");

            // --- 2. Seed Categories ---
            SeedCategories(context);
            var allCategories = context.Categories.ToList();
            var leafCategories = allCategories.Where(c => !allCategories.Any(sub => sub.ParentCategoryId == c.Id)).ToList();

            // --- 3. Seed Tags ---
            var tags = SeedTags(context);

            // --- 4. Seed Category-Tag Relationships ---
            SeedCategoryTags(context, allCategories, tags);

            // --- 5. Seed Products ---
            var creators = users.Where(u => u.Role == "Creator").ToList();
            var products = SeedProducts(context, creators, leafCategories);

            // --- 6. Seed Product-Tag Relationships ---
            SeedProductTags(context, products, tags);
            
            // --- 7. Seed Files for Products ---
            SeedFiles(context, products);

            // --- 8. Seed Wishlist Items ---
            var customers = users.Where(u => u.Role == "Customer").ToList();
            SeedWishlistItems(context, customers, products);

            // --- 9. Seed Orders ---
            var orders = SeedOrders(context, customers, products);

            // --- 10. Seed Reviews ---
            SeedReviews(context, orders);
        }

        private static void ClearData(RaqmiyaDbContext context)
        {
            // Using raw SQL for efficiency and to bypass EF Core's change tracking
            context.Database.ExecuteSqlRaw("DELETE FROM [Reviews]");
            context.Database.ExecuteSqlRaw("DELETE FROM [OrderItems]");
            context.Database.ExecuteSqlRaw("DELETE FROM [Orders]");
            context.Database.ExecuteSqlRaw("DELETE FROM [WishlistItems]");
            context.Database.ExecuteSqlRaw("DELETE FROM [ProductTags]");
            context.Database.ExecuteSqlRaw("DELETE FROM [AddedFile]");
            context.Database.ExecuteSqlRaw("DELETE FROM [Products]");
            context.Database.ExecuteSqlRaw("DELETE FROM [CategoryTags]");
            context.Database.ExecuteSqlRaw("DELETE FROM [Tags]");
            context.Database.ExecuteSqlRaw("DELETE FROM [Categories]");
            context.Database.ExecuteSqlRaw("DELETE FROM [Users]");
            
            // Reset identity seeds
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[Reviews]', RESEED, 0)");
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[OrderItems]', RESEED, 0)");
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[Orders]', RESEED, 0)");
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[WishlistItems]', RESEED, 0)");
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[ProductTags]', RESEED, 0)");
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[AddedFile]', RESEED, 0)");
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[Products]', RESEED, 0)");
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[CategoryTags]', RESEED, 0)");
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[Tags]', RESEED, 0)");
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[Categories]', RESEED, 0)");
            context.Database.ExecuteSqlRaw("DBCC CHECKIDENT ('[Users]', RESEED, 0)");
        }

        private static string GenerateSalt()
        {
            byte[] saltBytes = new byte[16];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(saltBytes);
            }
            return Convert.ToBase64String(saltBytes);
        }

        private static string HashPassword(string password, string salt)
        {
            var saltBytes = Convert.FromBase64String(salt);
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, saltBytes, 10000, HashAlgorithmName.SHA256))
            {
                byte[] hash = pbkdf2.GetBytes(32);
                return Convert.ToBase64String(hash);
            }
        }

        private static List<User> SeedUsers(RaqmiyaDbContext context, string commonPassword)
        {
            if (context.Users.Any()) return context.Users.ToList();

            var users = new List<User>();
            
            // Admin
            var adminSalt = GenerateSalt();
            users.Add(new User { Username = "admin", Email = "admin@raqmiya.com", HashedPassword = HashPassword(commonPassword, adminSalt), Salt = adminSalt, Role = "Admin", CreatedAt = DateTime.UtcNow, IsActive = true });

            // Creators
            var creatorNames = new[] { "PixelForge", "SoundWeaver", "CodeCrafter", "ArtisanAlpha", "StorySpinner", "DesignDynamo", "LogicLord", "VisionaryVibes", "BuildMaster", "MelodyMaker" };
            foreach (var name in creatorNames)
            {
                var salt = GenerateSalt();
                users.Add(new User { Username = name, Email = $"{name.ToLower()}@creator.com", HashedPassword = HashPassword(commonPassword, salt), Salt = salt, Role = "Creator", CreatedAt = DateTime.UtcNow.AddDays(-_random.Next(30, 365)), IsActive = true, ProfileDescription = $"Welcome to the creative world of {name}!" });
            }

            // Customers
            for (int i = 1; i <= 20; i++)
            {
                var salt = GenerateSalt();
                users.Add(new User { Username = $"Customer{i}", Email = $"customer{i}@example.com", HashedPassword = HashPassword(commonPassword, salt), Salt = salt, Role = "Customer", CreatedAt = DateTime.UtcNow.AddDays(-_random.Next(1, 365)), IsActive = true });
            }

            context.Users.AddRange(users);
            context.SaveChanges();
            return users;
        }

        private static void SeedCategories(RaqmiyaDbContext context)
        {
            if (context.Categories.Any()) return;

            var categories = new List<Category>
            {
                // Root Categories
                // new Category { Name = "Ebooks" },
                // new Category { Name = "Courses" },
                new Category { Name = "Fitness & Health" },
                new Category { Name = "Self Improvement" },
                new Category { Name = "Writings & Publishing" },
                new Category { Name = "Education" },
                new Category { Name = "Business & Money" },
                new Category { Name = "Drawing & Painting" },
                new Category { Name = "Design" },
                new Category { Name = "3D" },
                new Category { Name = "Music & Sound Design" },
                new Category { Name = "Films" },
                new Category { Name = "Software Development" },
                new Category { Name = "Gaming" },
                new Category { Name = "Photography" },
                new Category { Name = "Comics & Graphic Novels" },
                new Category { Name = "Fiction Books" },
                
                
                new Category { Name = "Audio" },
                new Category { Name = "Recorded Music" }
            };
            context.Categories.AddRange(categories);
            context.SaveChanges();

            var categoryMap = context.Categories.Where(c => c.ParentCategoryId == null).ToDictionary(c => c.Name, c => c.Id);

            // var subCategories = new List<Category>
            // {
            //     // Fitness & Health
            //     new Category { Name = "Exercise & Workout", ParentCategoryId = categoryMap["Fitness & Health"] },
            //     new Category { Name = "Nutrition", ParentCategoryId = categoryMap["Fitness & Health"] },
            //     // Self Improvement
            //     new Category { Name = "Productivity", ParentCategoryId = categoryMap["Self Improvement"] },
            //     new Category { Name = "Spirituality", ParentCategoryId = categoryMap["Self Improvement"] },
            //     // Business & Money
            //     new Category { Name = "Entrepreneurship", ParentCategoryId = categoryMap["Business & Money"] },
            //     new Category { Name = "Marketing & Sales", ParentCategoryId = categoryMap["Business & Money"] },
            //     // 3D
            //     new Category { Name = "3D Assets", ParentCategoryId = categoryMap["3D"] },
            //     new Category { Name = "3D Modeling", ParentCategoryId = categoryMap["3D"] },
            //     // ... (add more subcategories based on previous logic for brevity)
            // };
            var subCategories = new List<Category>
            {
                // Fitness & Health
                new Category { Name = "Exercise & Workout", ParentCategoryId = categoryMap["Fitness & Health"] },
                new Category { Name = "Running", ParentCategoryId = categoryMap["Fitness & Health"] },
                new Category { Name = "Sports", ParentCategoryId = categoryMap["Fitness & Health"] },
                new Category { Name = "Weight Loss", ParentCategoryId = categoryMap["Fitness & Health"] },
                new Category { Name = "Yoga", ParentCategoryId = categoryMap["Fitness & Health"] },
                new Category { Name = "Nutrition", ParentCategoryId = categoryMap["Fitness & Health"] },
                new Category { Name = "Recipes", ParentCategoryId = categoryMap["Fitness & Health"] },
                new Category { Name = "Vegan", ParentCategoryId = categoryMap["Fitness & Health"] },
                new Category { Name = "Courses", ParentCategoryId = categoryMap["Fitness & Health"] },
                new Category { Name = "Resourses", ParentCategoryId = categoryMap["Fitness & Health"] },


                // Self Improvement
                new Category { Name = "Cooking", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Crafts & DYI", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Dating & Relationships", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Outdoors", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Philosophy", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Productivity", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Psychology", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Spirituality", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Travel", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Wedding", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Wellness", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Astrology", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Magic", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Meditaation", ParentCategoryId = categoryMap["Self Improvement"] },
                new Category { Name = "Mysticism", ParentCategoryId = categoryMap["Self Improvement"] },

                // Writings & Publishing
                new Category { Name = "Artwork Commisions", ParentCategoryId = categoryMap["Writings & Publishing"] },
                new Category { Name = "Digital Illustration", ParentCategoryId = categoryMap["Writings & Publishing"] },
                new Category { Name = "Tradititional Art", ParentCategoryId = categoryMap["Writings & Publishing"] },

                // Education
                new Category { Name = "Classroom", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "English", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "History", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "Math", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "Science", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "Social Studies", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "Specialties", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "Test Prep", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "Medicine", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "History", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "Law", ParentCategoryId = categoryMap["Education"] },
                new Category { Name = "Politics", ParentCategoryId = categoryMap["Education"] },

                // Business & Money
                new Category { Name = "Accounting", ParentCategoryId = categoryMap["Business & Money"] },
                new Category { Name = "Entrepreneurship", ParentCategoryId = categoryMap["Business & Money"] },
                new Category { Name = "Gigs & Side Projects", ParentCategoryId = categoryMap["Business & Money"] },
                new Category { Name = "Investing", ParentCategoryId = categoryMap["Business & Money"] },
                new Category { Name = "Managment & LeaderShip", ParentCategoryId = categoryMap["Business & Money"] },
                new Category { Name = "Marketing & Sales", ParentCategoryId = categoryMap["Business & Money"] },
                new Category { Name = "Personal Finance", ParentCategoryId = categoryMap["Business & Money"] },
                new Category { Name = "Real State", ParentCategoryId = categoryMap["Business & Money"] },
                new Category { Name = "Analytics", ParentCategoryId = categoryMap["Business & Money"] },
                new Category { Name = "Email", ParentCategoryId = categoryMap["Business & Money"] },
                new Category { Name = "Social Media", ParentCategoryId = categoryMap["Business & Money"] },

                // Design
                new Category { Name = "Architecture", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Branding Entertainment Design", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Fashion Design", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Fonts", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Graphics", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Icons", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Industrial Design", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Interior Design", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Print & Packaging", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "UI & Web", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Wallpapers", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Courses", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Podcasts", ParentCategoryId = categoryMap["Design"] },
                new Category { Name = "Resourses", ParentCategoryId = categoryMap["Design"] },

                // 3D
                new Category { Name = "3D Assets", ParentCategoryId = categoryMap["3D"] },
                new Category { Name = "3D Modeling", ParentCategoryId = categoryMap["3D"] },
                new Category { Name = "Animating", ParentCategoryId = categoryMap["3D"] },
                new Category { Name = "AR/VR", ParentCategoryId = categoryMap["3D"] },
                new Category { Name = "Avatars", ParentCategoryId = categoryMap["3D"] },
                new Category { Name = "Character Design", ParentCategoryId = categoryMap["3D"] },
                new Category { Name = "Rigging", ParentCategoryId = categoryMap["3D"] },
                new Category { Name = "Texture", ParentCategoryId = categoryMap["3D"] },
                new Category { Name = "VRChat", ParentCategoryId = categoryMap["3D"] },

                // Music & Sound Design
                new Category { Name = "Dance & Theater", ParentCategoryId = categoryMap["Music & Sound Design"] },
                new Category { Name = "Instruments", ParentCategoryId = categoryMap["Music & Sound Design"] },
                new Category { Name = "Sound Design", ParentCategoryId = categoryMap["Music & Sound Design"] },
                new Category { Name = "Vocal", ParentCategoryId = categoryMap["Music & Sound Design"] },

                // Films
                new Category { Name = "Comedy", ParentCategoryId = categoryMap["Films"] },
                new Category { Name = "Dance", ParentCategoryId = categoryMap["Films"] },
                new Category { Name = "Documentary", ParentCategoryId = categoryMap["Films"] },
                new Category { Name = "Movie", ParentCategoryId = categoryMap["Films"] },
                new Category { Name = "Performance", ParentCategoryId = categoryMap["Films"] },
                new Category { Name = "Short Film", ParentCategoryId = categoryMap["Films"] },
                new Category { Name = "Sports Events", ParentCategoryId = categoryMap["Films"] },
                new Category { Name = "Theatre", ParentCategoryId = categoryMap["Films"] },
                new Category { Name = "Video Production & Editing", ParentCategoryId = categoryMap["Films"] },
                new Category { Name = "Videography", ParentCategoryId = categoryMap["Films"] },

                // Software Development
                new Category { Name = "App Development", ParentCategoryId = categoryMap["Software Development"] },
                new Category { Name = "Hardware", ParentCategoryId = categoryMap["Software Development"] },
                new Category { Name = "Programming", ParentCategoryId = categoryMap["Software Development"] },
                new Category { Name = "Software & Plugins", ParentCategoryId = categoryMap["Software Development"] },
                new Category { Name = "Web Development", ParentCategoryId = categoryMap["Software Development"] },

                // Gaming
                new Category { Name = "Streaming", ParentCategoryId = categoryMap["Gaming"] },

                // Photography
                new Category { Name = "Cosplay", ParentCategoryId = categoryMap["Photography"] },
                new Category { Name = "Photo Courses", ParentCategoryId = categoryMap["Photography"] },
                new Category { Name = "Photo Presets & Actions", ParentCategoryId = categoryMap["Photography"] },
                new Category { Name = "Reference Photos", ParentCategoryId = categoryMap["Photography"] },
                new Category { Name = "Stock Photos", ParentCategoryId = categoryMap["Photography"] },

                // Comics & Graphic Novels
                new Category { Name = "Children's Books", ParentCategoryId = categoryMap["Comics & Graphic Novels"] },
                new Category { Name = "Fantasy", ParentCategoryId = categoryMap["Comics & Graphic Novels"] },
                new Category { Name = "Mystery", ParentCategoryId = categoryMap["Comics & Graphic Novels"] },
                new Category { Name = "Romance", ParentCategoryId = categoryMap["Comics & Graphic Novels"] },
                new Category { Name = "Science Fiction & Young Adult", ParentCategoryId = categoryMap["Comics & Graphic Novels"] },

            };
            context.Categories.AddRange(subCategories);
            context.SaveChanges();
        }

        private static List<Tag> SeedTags(RaqmiyaDbContext context)
        {
            if (context.Tags.Any()) return context.Tags.ToList();
            
            var tags = new List<Tag>
            {
                new Tag { Name = "Unity" }, new Tag { Name = "C#" }, new Tag { Name = "Tutorial" }, new Tag { Name = "Guide" },
                new Tag { Name = "Fitness Plan" }, new Tag { Name = "Workout" }, new Tag { Name = "Healthy" }, new Tag { Name = "Diet" },
                new Tag { Name = "Productivity Hacks" }, new Tag { Name = "Self-Help" }, new Tag { Name = "Novel" }, new Tag { Name = "Fantasy" },
                new Tag { Name = "Business Plan" }, new Tag { Name = "Startup" }, new Tag { Name = "Illustration" }, new Tag { Name = "Photoshop" },
                new Tag { Name = "Blender" }, new Tag { Name = "3D Model" }, new Tag { Name = "Low Poly" }, new Tag { Name = "Game-Ready" },
                new Tag { Name = "Soundtrack" }, new Tag { Name = "SFX" }, new Tag { Name = "Short Film" }, new Tag { Name = "Script" },
                new Tag { Name = "Web Development" }, new Tag { Name = "JavaScript" }, new Tag { Name = "React" }, new Tag { Name = "Game Asset" },
                new Tag { Name = "Indie" }, new Tag { Name = "Lightroom" }, new Tag { Name = "Presets" }, new Tag { Name = "Comic" },
                new Tag { Name = "Graphic Novel" }, new Tag { Name = "Sci-Fi" }, new Tag { Name = "Textbook" }, new Tag { Name = "Study Guide" },
                new Tag { Name = "UI Kit" }, new Tag { Name = "Icons" }, new Tag { Name = "Podcast" }, new Tag { Name = "Album" }
            };
            context.Tags.AddRange(tags);
            context.SaveChanges();
            return tags;
        }

        private static void SeedCategoryTags(RaqmiyaDbContext context, List<Category> categories, List<Tag> tags)
        {
            if (context.CategoryTags.Any()) return;
            
            var categoryTags = new List<CategoryTag>();
            var tagsCopy = new List<Tag>(tags);

            foreach (var category in categories)
            {
                int tagsToAssign = _random.Next(2, 6);
                for (int i = 0; i < tagsToAssign; i++)
                {
                    var tag = tagsCopy[_random.Next(tagsCopy.Count)];
                    if (!categoryTags.Any(ct => ct.CategoryId == category.Id && ct.TagId == tag.Id))
                    {
                        categoryTags.Add(new CategoryTag { CategoryId = category.Id, TagId = tag.Id });
                    }
                }
            }
            context.CategoryTags.AddRange(categoryTags);
            context.SaveChanges();
        }

        private static List<Product> SeedProducts(RaqmiyaDbContext context, List<User> creators, List<Category> categories)
        {
            if (context.Products.Any()) return context.Products.ToList();

            var products = new List<Product>();
            var productNames = new[] { "Ultimate Guide", "Masterclass", "Toolkit", "Collection", "Essentials Pack", "Pro Series", "Starter Kit", "Blueprint", "Framework", "Asset Pack" };
            var adjectives = new[] { "Complete", "Advanced", "Beginner's", "Modern", "Vintage", "Stylized", "Realistic", "Comprehensive", "Minimalist", "Epic" };

            foreach (var category in categories)
            {
                int productsToCreate = _random.Next(5, 11);
                for (int i = 0; i < productsToCreate; i++)
                {
                    var creator = creators[_random.Next(creators.Count)];
                    var productName = $"{adjectives[_random.Next(adjectives.Length)]} {category.Name} {productNames[_random.Next(productNames.Length)]}";
                    products.Add(new Product
                    {
                        Name = productName,
                        Description = $"A top-quality product for {category.Name}. Created by {creator.Username}.",
                        Price = (decimal)(_random.Next(5, 200) + _random.NextDouble()),
                        Currency = "USD",
                        CreatorId = creator.Id,
                        CategoryId = category.Id,
                        IsPublic = true,
                        Status = "published",
                        PublishedAt = DateTime.UtcNow.AddDays(-_random.Next(1, 30)),
                        Permalink = productName.ToLower().Replace(" ", "-").Replace("&", "and") + "-" + Guid.NewGuid().ToString().Substring(0, 4)
                    });
                }
            }
            context.Products.AddRange(products);
            context.SaveChanges();
            return products;
        }
        
        private static void SeedFiles(RaqmiyaDbContext context, List<Product> products)
        {
            if (context.Files.Any()) return;
            var files = new List<AddedFile>();
            foreach(var product in products)
            {
                files.Add(new AddedFile { ProductId = product.Id, Name = "preview.jpg", FileUrl = $"/uploads/products/{product.Id}/preview.jpg", Size = 1024, ContentType = "image/jpeg" });
                files.Add(new AddedFile { ProductId = product.Id, Name = "content.zip", FileUrl = $"/uploads/products/{product.Id}/content.zip", Size = 1024 * 10, ContentType = "application/zip" });
            }
            context.Files.AddRange(files);
            context.SaveChanges();
        }

        private static void SeedProductTags(RaqmiyaDbContext context, List<Product> products, List<Tag> tags)
        {
            if (context.ProductTags.Any()) return;
            var productTags = new List<ProductTag>();
            foreach (var product in products)
            {
                var categoryTags = context.CategoryTags.Where(ct => ct.CategoryId == product.CategoryId).Select(ct => ct.TagId).ToList();
                var tagsForProduct = tags.Where(t => categoryTags.Contains(t.Id)).ToList();
                int tagsToAssign = _random.Next(1, Math.Min(4, tagsForProduct.Count + 1));
                for (int i = 0; i < tagsToAssign; i++)
                {
                    var tag = tagsForProduct[_random.Next(tagsForProduct.Count)];
                    if (!productTags.Any(pt => pt.ProductId == product.Id && pt.TagId == tag.Id))
                    {
                        productTags.Add(new ProductTag { ProductId = product.Id, TagId = tag.Id });
                    }
                }
            }
            context.ProductTags.AddRange(productTags);
            context.SaveChanges();
        }

        private static void SeedWishlistItems(RaqmiyaDbContext context, List<User> customers, List<Product> products)
        {
            if (context.WishlistItems.Any()) return;
            var wishlistItems = new List<WishlistItem>();
            foreach (var customer in customers)
            {
                int itemsToAdd = _random.Next(2, 6);
                for (int i = 0; i < itemsToAdd; i++)
                {
                    var product = products[_random.Next(products.Count)];
                    if (!wishlistItems.Any(wi => wi.UserId == customer.Id && wi.ProductId == product.Id))
                    {
                        wishlistItems.Add(new WishlistItem { UserId = customer.Id, ProductId = product.Id, AddedAt = DateTime.UtcNow.AddDays(-_random.Next(1, 100)) });
                    }
                }
            }
            context.WishlistItems.AddRange(wishlistItems);
            context.SaveChanges();
        }

        private static List<Order> SeedOrders(RaqmiyaDbContext context, List<User> customers, List<Product> products)
        {
            if (context.Orders.Any()) return context.Orders.ToList();
            
            var orders = new List<Order>();
            for (int i = 0; i < 30; i++) // Create 30 orders
            {
                var customer = customers[_random.Next(customers.Count)];
                var orderProducts = new List<Product>();
                int itemsInOrder = _random.Next(1, 4);
                decimal total = 0;

                for (int j = 0; j < itemsInOrder; j++)
                {
                    var product = products[_random.Next(products.Count)];
                    if (!orderProducts.Contains(product))
                    {
                        orderProducts.Add(product);
                        total += product.Price;
                    }
                }

                if (orderProducts.Any())
                {
                    var order = new Order
                    {
                        BuyerId = customer.Id,
                        OrderedAt = DateTime.UtcNow.AddDays(-_random.Next(1, 200)),
                        TotalAmount = total,
                        Status = "Completed",
                        OrderItems = orderProducts.Select(p => new OrderItem { ProductId = p.Id, UnitPrice = p.Price, Quantity = 1 }).ToList()
                    };
                    orders.Add(order);
                }
            }
            context.Orders.AddRange(orders);
            context.SaveChanges();
            return orders;
        }

        private static void SeedReviews(RaqmiyaDbContext context, List<Order> orders)
        {
            if (context.Reviews.Any()) return;
            
            var reviews = new List<Review>();
            var positiveComments = new[] { "Amazing product!", "Highly recommended!", "Exactly what I needed.", "Great value for the price.", "Excellent quality." };
            var neutralComments = new[] { "It's okay.", "Does the job.", "Not bad, not great.", "Could be better." };
            var negativeComments = new[] { "Disappointed.", "Not as described.", "Waste of money.", "I want a refund.", "Full of bugs." };

            // Review about 50% of ordered items
            foreach (var order in orders.OrderBy(o => Guid.NewGuid()).Take(orders.Count / 2))
            {
                foreach (var item in order.OrderItems)
                {
                    // Avoid duplicate reviews
                    if (reviews.Any(r => r.UserId == order.BuyerId && r.ProductId == item.ProductId)) continue;

                    var rating = _random.Next(1, 6);
                    string comment;
                    if (rating >= 4) comment = positiveComments[_random.Next(positiveComments.Length)];
                    else if (rating == 3) comment = neutralComments[_random.Next(neutralComments.Length)];
                    else comment = negativeComments[_random.Next(negativeComments.Length)];

                    reviews.Add(new Review
                    {
                        ProductId = item.ProductId,
                        UserId = order.BuyerId,
                        Rating = rating,
                        Comment = comment,
                        CreatedAt = order.OrderedAt.AddDays(_random.Next(1, 10)),
                        IsApproved = true
                    });
                }
            }
            context.Reviews.AddRange(reviews);
            context.SaveChanges();
        }
    }
}
