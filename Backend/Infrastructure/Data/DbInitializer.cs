using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Bogus;
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

        private static string GetContentType(string extension)
        {
            return extension.ToLower() switch
            {
                ".pdf" => "application/pdf",
                ".zip" => "application/zip",
                ".mp3" => "audio/mpeg",
                ".mp4" => "video/mp4",
                ".psd" => "application/octet-stream",
                ".ai" => "application/postscript",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".png" => "image/png",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                _ => "application/octet-stream"
            };
        }

        public static void Seed(RaqmiyaDbContext context)
        {
            context.Database.Migrate();

            // --- Users ---
            if (!context.Users.Any())
            {
                var faker = new Faker("en_US");
                
                // Admin
                var adminSalt = GenerateSalt();
                context.Users.Add(new User {
                    Username = "admin", Email = "admin@raqmiya.com",
                    Salt = adminSalt, HashedPassword = HashPassword("adminpass", adminSalt),
                    Role = "Admin", CreatedAt = DateTime.UtcNow, IsActive = true
                });

                // Generate 150 creators from US and Europe
                var creators = new List<User>();
                var locales = new[] { "en_US", "en_GB", "de", "fr", "es", "it", "nl" };
                
                foreach (var locale in locales)
                {
                    var localCreators = new Faker<User>(locale)
                        .CustomInstantiator(f => {
                            var salt = GenerateSalt();
                            var firstName = f.Name.FirstName();
                            var lastName = f.Name.LastName();
                            return new User {
                                Username = f.Internet.UserName(firstName, lastName),
                                Email = f.Internet.Email(firstName, lastName),
                                Salt = salt,
                                HashedPassword = HashPassword("Pass12345", salt),
                                Role = "Creator",
                                CreatedAt = f.Date.Past(2),
                                IsActive = true
                            };
                        })
                        .Generate(150 / locales.Length);
                    creators.AddRange(localCreators);
                }

                // Generate 250 customers from US and Europe
                var customers = new List<User>();
                foreach (var locale in locales)
                {
                    var localCustomers = new Faker<User>(locale)
                        .CustomInstantiator(f => {
                            var salt = GenerateSalt();
                            var firstName = f.Name.FirstName();
                            var lastName = f.Name.LastName();
                            return new User {
                                Username = f.Internet.UserName(firstName, lastName),
                                Email = f.Internet.Email(firstName, lastName),
                                Salt = salt,
                                HashedPassword = HashPassword("Pass12345", salt),
                                Role = "Customer",
                                CreatedAt = f.Date.Past(2),
                                IsActive = true
                            };
                        })
                        .Generate(250 / locales.Length);
                    customers.AddRange(localCustomers);
                }

                context.Users.AddRange(creators);
                context.Users.AddRange(customers);
                context.SaveChanges();
            }

            // --- Categories ---
            if (!context.Categories.Any())
            {
                // All categories and subcategories, including all nested levels, matching categories.ts
                var categories = new List<Category>
                {
                    // ... The full flat list of categories, with Id, Name, and ParentCategoryId, matching categories.ts ...
                    new Category { Name = "Fitness & Health" },
                    new Category { Name = "Self Improvement" },
                    new Category { Name = "Education" },
                    new Category { Name = "Writings & Publishing" },
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
                    new Category { Name = "Recorded Music" },
                    // Subcategories - Fitness & Health (ParentId: 1)
                    new Category { Name = "Exercise & Workout", ParentCategoryId = 1 },
                    new Category { Name = "Running", ParentCategoryId = 1 },
                    new Category { Name = "Sports", ParentCategoryId = 1 },
                    new Category { Name = "Weight Loss", ParentCategoryId = 1 },
                    new Category { Name = "Yoga", ParentCategoryId = 1 },
                    // Subcategories - Self Improvement (ParentId: 2)
                    new Category { Name = "Cooking", ParentCategoryId = 2 },
                    new Category { Name = "Crafts & DYI", ParentCategoryId = 2 },
                    new Category { Name = "Dating & Relationships", ParentCategoryId = 2 },
                    new Category { Name = "Outdoors", ParentCategoryId = 2 },
                    new Category { Name = "Productivity", ParentCategoryId = 2 },
                    new Category { Name = "Spirituality", ParentCategoryId = 2 },
                    new Category { Name = "Travel", ParentCategoryId = 2 },
                    new Category { Name = "Wedding", ParentCategoryId = 2 },
                    new Category { Name = "Wellness", ParentCategoryId = 2 },
                    // Subcategoriation (ParentId: 3)
                    new Category { Name = "Classroom", ParentCategoryId = 3 },
                    new Category { Name = "English", ParentCategoryId = 3 },
                    new Category { Name = "History", ParentCategoryId = 3 },
                    new Category { Name = "Math", ParentCategoryId = 3 },
                    new Category { Name = "Science", ParentCategoryId = 3 },
                    new Category { Name = "Social Studies", ParentCategoryId = 3 },
                    new Category { Name = "Specialties", ParentCategoryId = 3 },
                    new Category { Name = "Test Prep", ParentCategoryId = 3 },
                    // Subcategories - Writings & Publishing (ParentId: 4)
                    new Category { Name = "Courses", ParentCategoryId = 4 },
                    new Category { Name = "Resourses", ParentCategoryId = 4 },
                    // Subcategories - Business & Money (ParentId: 5)
                    new Category { Name = "Accounting", ParentCategoryId = 5 },
                    new Category { Name = "Entrepreneurship", ParentCategoryId = 5 },
                    new Category { Name = "Gigs & Side Projects", ParentCategoryId = 5 },
                    new Category { Name = "Investing", ParentCategoryId = 5 },
                    new Category { Name = "Managment & LeaderShip", ParentCategoryId = 5 },
                    new Category { Name = "Marketing & Sales", ParentCategoryId = 5 },
                    new Category { Name = "Personal Finance", ParentCategoryId = 5 },
                    new Category { Name = "Real State", ParentCategoryId = 5 },
                    // Subcategories - Drawing & Painting (ParentId: 6)
                    new Category { Name = "Artwork Commisions", ParentCategoryId = 6 },
                    new Category { Name = "Digital Illustration", ParentCategoryId = 6 },
                    new Category { Name = "Tradititional Art", ParentCategoryId = 6 },
                    // Subcategories - Design (ParentId: 7)
                    new Category { Name = "Architecture", ParentCategoryId = 7 },
                    new Category { Name = "Branding Entertainment Design", ParentCategoryId = 7 },
                    new Category { Name = "Fashion Design", ParentCategoryId = 7 },
                    new Category { Name = "Fonts", ParentCategoryId = 7 },
                    new Category { Name = "Graphics", ParentCategoryId = 7 },
                    new Category { Name = "Icons", ParentCategoryId = 7 },
                    new Category { Name = "Industrial Design", ParentCategoryId = 7 },
                    new Category { Name = "Interior Design", ParentCategoryId = 7 },
                    new Category { Name = "Print & Packaging", ParentCategoryId = 7 },
                    new Category { Name = "UI & Web", ParentCategoryId = 7 },
                    new Category { Name = "Wallpapers", ParentCategoryId = 7 },
                    // Subcategories - 3D (ParentId: 8)
                    new Category { Name = "3D Assets", ParentCategoryId = 8 },
                    new Category { Name = "3D Modeling", ParentCategoryId = 8 },
                    new Category { Name = "Animating", ParentCategoryId = 8 },
                    new Category { Name = "AR/VR", ParentCategoryId = 8 },
                    new Category { Name = "Avatars", ParentCategoryId = 8 },
                    new Category { Name = "Character Design", ParentCategoryId = 8 },
                    new Category { Name = "Rigging", ParentCategoryId = 8 },
                    new Category { Name = "Texture", ParentCategoryId = 8 },
                    new Category { Name = "VRChat", ParentCategoryId = 8 },
                    // Subcategories - Music & Sound Design (ParentId: 9)
                    new Category { Name = "Dance & Theater", ParentCategoryId = 9 },
                    new Category { Name = "Instruments", ParentCategoryId = 9 },
                    new Category { Name = "Sound Design", ParentCategoryId = 9 },
                    new Category { Name = "Vocal", ParentCategoryId = 9 },
                    // Subcategories - Films (ParentId: 10)
                    new Category { Name = "Comedy", ParentCategoryId = 10 },
                    new Category { Name = "Dance", ParentCategoryId = 10 },
                    new Category { Name = "Documentary", ParentCategoryId = 10 },
                    new Category { Name = "Movie", ParentCategoryId = 10 },
                    new Category { Name = "Performance", ParentCategoryId = 10 },
                    new Category { Name = "Short Film", ParentCategoryId = 10 },
                    new Category { Name = "Sports Events", ParentCategoryId = 10 },
                    new Category { Name = "Theatre", ParentCategoryId = 10 },
                    new Category { Name = "Video Production & Editing", ParentCategoryId = 10 },
                    new Category { Name = "Videography", ParentCategoryId = 10 },
                    // Subcategories - Software Development (ParentId: 11)
                    new Category { Name = "App Development", ParentCategoryId = 11 },
                    new Category { Name = "Hardware", ParentCategoryId = 11 },
                    new Category { Name = "Programming", ParentCategoryId = 11 },
                    new Category { Name = "Software & Plugins", ParentCategoryId = 11 },
                    new Category { Name = "Web Development", ParentCategoryId = 11 },
                    // Subcategories - Gaming (ParentId: 12)
                    new Category { Name = "Streaming", ParentCategoryId = 12 },
                    // Subcategories - Photography (ParentId: 13)
                    new Category { Name = "Cosplay", ParentCategoryId = 13 },
                    new Category { Name = "Photo Courses", ParentCategoryId = 13 },
                    new Category { Name = "Photo Presets & Actions", ParentCategoryId = 13 },
                    new Category { Name = "Reference Photos", ParentCategoryId = 13 },
                    new Category { Name = "Stock Photos", ParentCategoryId = 13 },
                    // Subcategories - Comics & Graphic Novels (ParentId: 14)
                    // (No subcategories in provided data)
                    // Subcategories - Fiction Books (ParentId: 15)
                    new Category {  Name = "Children's Books", ParentCategoryId = 15 },
                    new Category {  Name = "Fantasy", ParentCategoryId = 15 },
                    new Category {  Name = "Mystery", ParentCategoryId = 15 },
                    new Category {  Name = "Romance", ParentCategoryId = 15 },
                    new Category {  Name = "Science Fiction & Young Adult", ParentCategoryId = 15 },
                    // Subcategories - Audio (ParentId: 16)
                    new Category { Name = "ASMR", ParentCategoryId = 16 },
                    new Category { Name = "Healing", ParentCategoryId = 16 },
                    new Category { Name = "Hypnosis", ParentCategoryId = 16 },
                    new Category { Name = "Sleep & Meditation", ParentCategoryId = 16 },
                    new Category { Name = "Subliminal Messages", ParentCategoryId = 16 },
                    new Category { Name = "Voiceover", ParentCategoryId = 16 },
                    // Subcategories - Recorded Music (ParentId: 17)
                    new Category { Name = "Albums", ParentCategoryId = 17 },
                    new Category { Name = "Singles", ParentCategoryId = 17 },
                    // Sub-subcategories - Cooking - Self Improvement (23)
                    new Category { Name = "Nutrition", ParentCategoryId = 23 },
                    new Category { Name = "Recipes", ParentCategoryId = 23 },
                    new Category { Name = "Vegan", ParentCategoryId = 23 },
                    // Sub-subcategories - Outdoors - Self Improvement (26)
                    new Category { Name = "Boating & Fishing", ParentCategoryId = 26 },
                    new Category { Name = "Hunting", ParentCategoryId = 26 },
                    new Category { Name = "Trekking", ParentCategoryId = 26 },
                    // Sub-subcategories - Spirituality - Self Improvement (28)
                    new Category { Name = "Astrology", ParentCategoryId = 28 },
                    new Category { Name = "Magic", ParentCategoryId = 28 },
                    new Category { Name = "Meditation", ParentCategoryId = 28 },
                    // Sub-subcategories - Science - Education
                    new Category { Name = "Medicine", ParentCategoryId = 36 },
                    new Category { Name = "Physics", ParentCategoryId = 36 },
                    new Category { Name = "Computer Science", ParentCategoryId = 39 },
                    // Sub-subcategories - Social Studies - Education (37)
                    new Category { Name = "History", ParentCategoryId = 37 },
                    new Category { Name = "Law", ParentCategoryId = 37 },
                    new Category { Name = "Politics", ParentCategoryId = 37 },
                    new Category { Name = "Economics", ParentCategoryId = 37 },
                    new Category { Name = "Psychology", ParentCategoryId = 37 },
                    new Category { Name = "Anthropology", ParentCategoryId = 37 },
                    new Category { Name = "Sociology", ParentCategoryId = 37 },
                    // Sub-subcategories - Entrepreneurship - Business & Money (43)
                    new Category { Name = "Courses", ParentCategoryId = 43 },
                    new Category { Name = "Podcasts", ParentCategoryId = 43 },
                    new Category { Name = "Resourses", ParentCategoryId = 43 },
                    // Sub-subcategories - Movie - Films (80)
                    new Category { Name = "Action & Adventure", ParentCategoryId = 80 },
                    new Category { Name = "Animation", ParentCategoryId = 80 },
                    new Category { Name = "Anime", ParentCategoryId = 80 },
                    new Category { Name = "Black Voices", ParentCategoryId = 80 },
                    new Category { Name = "Classics", ParentCategoryId = 80 },
                    new Category { Name = "Drama", ParentCategoryId = 80 },
                    new Category { Name = "Faith & Spirituality", ParentCategoryId = 80 },
                    new Category { Name = "Foreign Language & International", ParentCategoryId = 80 },
                    new Category { Name = "Horror", ParentCategoryId = 80 },
                    new Category { Name = "Thriller", ParentCategoryId = 80 },
                    new Category { Name = "Indian Cinema & Bollywood", ParentCategoryId = 80 },
                    new Category { Name = "Indie & Art House", ParentCategoryId = 80 },
                    new Category { Name = "Kids & Family", ParentCategoryId = 80 },
                    new Category { Name = "Music Videos & Concerts", ParentCategoryId = 80 },
                    new Category { Name = "Romance", ParentCategoryId = 80 },
                    new Category { Name = "Science Fiction", ParentCategoryId = 80 },
                    // Sub-subcategories - App Development - Software Development (87)
                    new Category { Name = "React Native", ParentCategoryId = 87 },
                    new Category { Name = "Swift", ParentCategoryId = 87 },
                    // Sub-subcategories - Programming - Software Development (89)
                    new Category { Name = "C#", ParentCategoryId = 89 },
                    new Category { Name = "Java", ParentCategoryId = 89 },
                    new Category { Name = "Rust", ParentCategoryId = 89 },
                    new Category { Name = "GoLang", ParentCategoryId = 89 },
                    new Category { Name = "Zig", ParentCategoryId = 89 },
                    new Category { Name = "Python", ParentCategoryId = 89 },
                    new Category { Name = "JavaScript", ParentCategoryId = 89 },
                    new Category { Name = "PHP", ParentCategoryId = 89 },
                    new Category { Name = "Ruby", ParentCategoryId = 89 },
                    // Sub-subcategories - Software & Plugins - Software Development (90)
                    new Category { Name = "VS Code", ParentCategoryId = 90 },
                    new Category { Name = "Wordpress", ParentCategoryId = 90 },
                    // Sub-subcategories - Web Development - Software Development (91)
                    new Category { Name = "AWS", ParentCategoryId = 91 },
                    new Category { Name = "Frontend", ParentCategoryId = 91 },
                    new Category { Name = "Backend", ParentCategoryId = 91 },
                    // Sub-Subcategories  Singles - Recorded Music (110)
                    new Category { Name = "Children Music", ParentCategoryId = 110 },
                    new Category { Name = "Christian", ParentCategoryId = 110 },
                    new Category { Name = "Classic Rock", ParentCategoryId = 110 },
                    new Category { Name = "Classical", ParentCategoryId = 110 },
                    new Category { Name = "Country", ParentCategoryId = 110 },
                    new Category { Name = "Dance & Electronic", ParentCategoryId = 110 },
                    new Category { Name = "Folk", ParentCategoryId = 110 },
                    new Category { Name = "Gospel", ParentCategoryId = 110 },
                    new Category { Name = "Hard Rock & Metal", ParentCategoryId = 110 },
                    new Category { Name = "Holiday Music", ParentCategoryId = 110 },
                    new Category { Name = "Jazz", ParentCategoryId = 110 },
                    new Category { Name = "Latin Music", ParentCategoryId = 110 },
                    new Category { Name = "New Age", ParentCategoryId = 110 },
                    new Category { Name = "Opera & Vocal", ParentCategoryId = 110 },
                    new Category { Name = "Pop", ParentCategoryId = 110 },
                    new Category { Name = "Rap & Hip-Hop", ParentCategoryId = 110 },
                    new Category { Name = "R&B", ParentCategoryId = 110 },
                    new Category { Name = "Rock", ParentCategoryId = 110 },
                    new Category { Name = "Soundtracks", ParentCategoryId = 110 },
                    new Category { Name = "World Music", ParentCategoryId = 110 },
                    // Sub - Sub-Subcategories  -  Frontend  -  Web Development - Software Development (163)
                    new Category { Name = "React JS", ParentCategoryId = 163 },
                    new Category { Name = "Next JS", ParentCategoryId = 163 },
                    new Category { Name = "Angular", ParentCategoryId = 163 },
                    // Sub - Sub-Subcategories  -  Backend  -  Web Development - Software Development (164)
                    new Category { Name = ".NET", ParentCategoryId = 164 },
                    new Category { Name = "Spring Boot", ParentCategoryId = 164 },
                    new Category { Name = "Node.Js", ParentCategoryId = 164 },
                    new Category { Name = "NestJs", ParentCategoryId = 164 },
                    new Category { Name = "Django", ParentCategoryId = 164 },
                    new Category { Name = "Flask", ParentCategoryId = 164 },
                    new Category { Name = "Laravel", ParentCategoryId = 164 }
                };
                context.Categories.AddRange(categories);
                context.SaveChanges();
            }

            // --- Tags ---
            if (!context.Tags.Any())
            {
                var comprehensiveTags = new List<Tag>
                {
                    // Main Category Tags - Fitness & Health
                    new Tag { Name = "Fitness" }, new Tag { Name = "Health" }, new Tag { Name = "Wellness" }, new Tag { Name = "Exercise" },
                    new Tag { Name = "Workout" }, new Tag { Name = "Running" }, new Tag { Name = "Marathon" }, new Tag { Name = "Jogging" },
                    new Tag { Name = "Sports" }, new Tag { Name = "Basketball" }, new Tag { Name = "Football" }, new Tag { Name = "Soccer" },
                    new Tag { Name = "Weight Loss" }, new Tag { Name = "Diet" }, new Tag { Name = "Nutrition" }, new Tag { Name = "Calories" },
                    new Tag { Name = "Yoga" }, new Tag { Name = "Meditation" }, new Tag { Name = "Mindfulness" }, new Tag { Name = "Stretching" },
                    
                    // Self Improvement
                    new Tag { Name = "Self Improvement" }, new Tag { Name = "Personal Development" }, new Tag { Name = "Productivity" },
                    new Tag { Name = "Cooking" }, new Tag { Name = "Recipes" }, new Tag { Name = "Vegan" }, new Tag { Name = "Vegetarian" },
                    new Tag { Name = "Crafts" }, new Tag { Name = "DIY" }, new Tag { Name = "Handmade" }, new Tag { Name = "Arts & Crafts" },
                    new Tag { Name = "Dating" }, new Tag { Name = "Relationships" }, new Tag { Name = "Love" }, new Tag { Name = "Marriage" },
                    new Tag { Name = "Outdoors" }, new Tag { Name = "Camping" }, new Tag { Name = "Hiking" }, new Tag { Name = "Boating" },
                    new Tag { Name = "Fishing" }, new Tag { Name = "Hunting" }, new Tag { Name = "Trekking" }, new Tag { Name = "Adventure" },
                    new Tag { Name = "Time Management" }, new Tag { Name = "Goal Setting" }, new Tag { Name = "Motivation" },
                    new Tag { Name = "Spirituality" }, new Tag { Name = "Astrology" }, new Tag { Name = "Magic" }, new Tag { Name = "Crystals" },
                    new Tag { Name = "Travel" }, new Tag { Name = "Tourism" }, new Tag { Name = "Vacation" }, new Tag { Name = "Backpacking" },
                    new Tag { Name = "Wedding" }, new Tag { Name = "Planning" }, new Tag { Name = "Events" },
                    
                    // Education
                    new Tag { Name = "Education" }, new Tag { Name = "Learning" }, new Tag { Name = "Teaching" }, new Tag { Name = "Classroom" },
                    new Tag { Name = "English" }, new Tag { Name = "Grammar" }, new Tag { Name = "Writing" }, new Tag { Name = "Literature" },
                    new Tag { Name = "History" }, new Tag { Name = "Ancient History" }, new Tag { Name = "Modern History" }, new Tag { Name = "World War" },
                    new Tag { Name = "Math" }, new Tag { Name = "Mathematics" }, new Tag { Name = "Algebra" }, new Tag { Name = "Calculus" },
                    new Tag { Name = "Geometry" }, new Tag { Name = "Statistics" }, new Tag { Name = "Trigonometry" },
                    new Tag { Name = "Science" }, new Tag { Name = "Physics" }, new Tag { Name = "Chemistry" }, new Tag { Name = "Biology" },
                    new Tag { Name = "Medicine" }, new Tag { Name = "Anatomy" }, new Tag { Name = "Healthcare" },
                    new Tag { Name = "Social Studies" }, new Tag { Name = "Law" }, new Tag { Name = "Politics" }, new Tag { Name = "Government" },
                    new Tag { Name = "Economics" }, new Tag { Name = "Psychology" }, new Tag { Name = "Anthropology" }, new Tag { Name = "Sociology" },
                    new Tag { Name = "Test Prep" }, new Tag { Name = "SAT" }, new Tag { Name = "GRE" }, new Tag { Name = "GMAT" },
                    
                    // Writings & Publishing
                    new Tag { Name = "Writing" }, new Tag { Name = "Publishing" }, new Tag { Name = "Creative Writing" }, new Tag { Name = "Copywriting" },
                    new Tag { Name = "Content Writing" }, new Tag { Name = "Blogging" }, new Tag { Name = "Journalism" },
                    
                    // Business & Money
                    new Tag { Name = "Business" }, new Tag { Name = "Money" }, new Tag { Name = "Finance" }, new Tag { Name = "Investment" },
                    new Tag { Name = "Accounting" }, new Tag { Name = "Bookkeeping" }, new Tag { Name = "Taxes" }, new Tag { Name = "Financial Planning" },
                    new Tag { Name = "Entrepreneurship" }, new Tag { Name = "Startup" }, new Tag { Name = "Business Plan" }, new Tag { Name = "Innovation" },
                    new Tag { Name = "Side Hustle" }, new Tag { Name = "Freelancing" }, new Tag { Name = "Passive Income" },
                    new Tag { Name = "Investing" }, new Tag { Name = "Stocks" }, new Tag { Name = "Bonds" }, new Tag { Name = "Cryptocurrency" },
                    new Tag { Name = "Real Estate" }, new Tag { Name = "Property" }, new Tag { Name = "Rental Income" },
                    new Tag { Name = "Management" }, new Tag { Name = "Leadership" }, new Tag { Name = "Team Building" }, new Tag { Name = "Project Management" },
                    new Tag { Name = "Marketing" }, new Tag { Name = "Sales" }, new Tag { Name = "Digital Marketing" }, new Tag { Name = "SEO" },
                    new Tag { Name = "Social Media Marketing" }, new Tag { Name = "Email Marketing" }, new Tag { Name = "Content Marketing" },
                    new Tag { Name = "Personal Finance" }, new Tag { Name = "Budgeting" }, new Tag { Name = "Saving" }, new Tag { Name = "Debt Management" },
                    
                    // Drawing & Painting
                    new Tag { Name = "Drawing" }, new Tag { Name = "Painting" }, new Tag { Name = "Art" }, new Tag { Name = "Fine Art" },
                    new Tag { Name = "Digital Art" }, new Tag { Name = "Digital Painting" }, new Tag { Name = "Illustration" }, new Tag { Name = "Character Design" },
                    new Tag { Name = "Concept Art" }, new Tag { Name = "Portrait" }, new Tag { Name = "Landscape" }, new Tag { Name = "Still Life" },
                    new Tag { Name = "Traditional Art" }, new Tag { Name = "Oil Painting" }, new Tag { Name = "Watercolor" }, new Tag { Name = "Acrylic" },
                    new Tag { Name = "Pencil Drawing" }, new Tag { Name = "Charcoal" }, new Tag { Name = "Sketch" },
                    
                    // Design
                    new Tag { Name = "Design" }, new Tag { Name = "Graphic Design" }, new Tag { Name = "Logo Design" }, new Tag { Name = "Branding" },
                    new Tag { Name = "Typography" }, new Tag { Name = "Color Theory" }, new Tag { Name = "Layout" },
                    new Tag { Name = "Architecture" }, new Tag { Name = "Building Design" }, new Tag { Name = "Urban Planning" },
                    new Tag { Name = "Fashion Design" }, new Tag { Name = "Clothing" }, new Tag { Name = "Style" }, new Tag { Name = "Textile" },
                    new Tag { Name = "Fonts" }, new Tag { Name = "Typeface" }, new Tag { Name = "Calligraphy" },
                    new Tag { Name = "Graphics" }, new Tag { Name = "Vector" }, new Tag { Name = "Raster" }, new Tag { Name = "Adobe" },
                    new Tag { Name = "Icons" }, new Tag { Name = "UI Icons" }, new Tag { Name = "Icon Set" },
                    new Tag { Name = "Industrial Design" }, new Tag { Name = "Product Design" }, new Tag { Name = "UX Design" },
                    new Tag { Name = "Interior Design" }, new Tag { Name = "Home Decor" }, new Tag { Name = "Furniture" },
                    new Tag { Name = "Print Design" }, new Tag { Name = "Packaging" }, new Tag { Name = "Poster" }, new Tag { Name = "Flyer" },
                    new Tag { Name = "UI Design" }, new Tag { Name = "Web Design" }, new Tag { Name = "Mobile Design" }, new Tag { Name = "App Design" },
                    new Tag { Name = "Wallpapers" }, new Tag { Name = "Desktop Wallpaper" }, new Tag { Name = "Mobile Wallpaper" },
                    
                    // 3D
                    new Tag { Name = "3D" }, new Tag { Name = "3D Modeling" }, new Tag { Name = "3D Animation" }, new Tag { Name = "3D Rendering" },
                    new Tag { Name = "3D Assets" }, new Tag { Name = "Game Assets" }, new Tag { Name = "Low Poly" }, new Tag { Name = "High Poly" },
                    new Tag { Name = "Animation" }, new Tag { Name = "Motion Graphics" }, new Tag { Name = "Keyframe" },
                    new Tag { Name = "AR" }, new Tag { Name = "VR" }, new Tag { Name = "Virtual Reality" }, new Tag { Name = "Augmented Reality" },
                    new Tag { Name = "Avatars" }, new Tag { Name = "Character Models" }, new Tag { Name = "Human Models" },
                    new Tag { Name = "Rigging" }, new Tag { Name = "Skeleton" }, new Tag { Name = "Bone Structure" },
                    new Tag { Name = "Texture" }, new Tag { Name = "Materials" }, new Tag { Name = "Shaders" }, new Tag { Name = "UV Mapping" },
                    new Tag { Name = "VRChat" }, new Tag { Name = "Virtual Worlds" }, new Tag { Name = "Metaverse" },
                    
                    // Music & Sound Design
                    new Tag { Name = "Music" }, new Tag { Name = "Audio" }, new Tag { Name = "Sound" }, new Tag { Name = "Music Production" },
                    new Tag { Name = "Beat Making" }, new Tag { Name = "Mixing" }, new Tag { Name = "Mastering" }, new Tag { Name = "Recording" },
                    new Tag { Name = "Dance Music" }, new Tag { Name = "Theater" }, new Tag { Name = "Musical Theater" }, new Tag { Name = "Performance" },
                    new Tag { Name = "Instruments" }, new Tag { Name = "Guitar" }, new Tag { Name = "Piano" }, new Tag { Name = "Drums" },
                    new Tag { Name = "Violin" }, new Tag { Name = "Saxophone" }, new Tag { Name = "Trumpet" },
                    new Tag { Name = "Sound Design" }, new Tag { Name = "Sound Effects" }, new Tag { Name = "Foley" }, new Tag { Name = "Ambient" },
                    new Tag { Name = "Vocal" }, new Tag { Name = "Singing" }, new Tag { Name = "Voice Training" }, new Tag { Name = "Choir" },
                    
                    // Films
                    new Tag { Name = "Film" }, new Tag { Name = "Video" }, new Tag { Name = "Cinema" }, new Tag { Name = "Movie" },
                    new Tag { Name = "Comedy" }, new Tag { Name = "Stand-up" }, new Tag { Name = "Humor" },
                    new Tag { Name = "Dance" }, new Tag { Name = "Choreography" }, new Tag { Name = "Ballet" }, new Tag { Name = "Hip Hop Dance" },
                    new Tag { Name = "Documentary" }, new Tag { Name = "Non-fiction" }, new Tag { Name = "Educational Video" },
                    new Tag { Name = "Action" }, new Tag { Name = "Adventure" }, new Tag { Name = "Drama" }, new Tag { Name = "Romance" },
                    new Tag { Name = "Horror" }, new Tag { Name = "Thriller" }, new Tag { Name = "Science Fiction" }, new Tag { Name = "Fantasy" },
                    new Tag { Name = "Animation" }, new Tag { Name = "Anime" }, new Tag { Name = "Cartoon" },
                    new Tag { Name = "Short Film" }, new Tag { Name = "Indie Film" }, new Tag { Name = "Film Festival" },
                    new Tag { Name = "Sports Events" }, new Tag { Name = "Live Sports" }, new Tag { Name = "Sports Documentary" },
                    new Tag { Name = "Theatre" }, new Tag { Name = "Stage" }, new Tag { Name = "Acting" },
                    new Tag { Name = "Video Production" }, new Tag { Name = "Video Editing" }, new Tag { Name = "Post Production" },
                    new Tag { Name = "Videography" }, new Tag { Name = "Cinematography" }, new Tag { Name = "Camera Work" },
                    
                    // Software Development
                    new Tag { Name = "Software Development" }, new Tag { Name = "Programming" }, new Tag { Name = "Coding" },
                    new Tag { Name = "App Development" }, new Tag { Name = "Mobile App" }, new Tag { Name = "iOS" }, new Tag { Name = "Android" },
                    new Tag { Name = "React Native" }, new Tag { Name = "Flutter" }, new Tag { Name = "Swift" }, new Tag { Name = "Kotlin" },
                    new Tag { Name = "Hardware" }, new Tag { Name = "Electronics" }, new Tag { Name = "Arduino" }, new Tag { Name = "Raspberry Pi" },
                    new Tag { Name = "C#" }, new Tag { Name = ".NET" }, new Tag { Name = "ASP.NET" }, new Tag { Name = "Blazor" },
                    new Tag { Name = "Java" }, new Tag { Name = "Spring Boot" }, new Tag { Name = "Maven" }, new Tag { Name = "Gradle" },
                    new Tag { Name = "Rust" }, new Tag { Name = "Systems Programming" }, new Tag { Name = "Memory Safety" },
                    new Tag { Name = "GoLang" }, new Tag { Name = "Go" }, new Tag { Name = "Concurrency" },
                    new Tag { Name = "Zig" }, new Tag { Name = "Low Level" }, new Tag { Name = "Performance" },
                    new Tag { Name = "Python" }, new Tag { Name = "Django" }, new Tag { Name = "Flask" }, new Tag { Name = "FastAPI" },
                    new Tag { Name = "Machine Learning" }, new Tag { Name = "Data Science" }, new Tag { Name = "AI" },
                    new Tag { Name = "JavaScript" }, new Tag { Name = "TypeScript" }, new Tag { Name = "Node.js" }, new Tag { Name = "React" },
                    new Tag { Name = "Angular" }, new Tag { Name = "Vue.js" }, new Tag { Name = "Next.js" }, new Tag { Name = "Nuxt.js" },
                    new Tag { Name = "PHP" }, new Tag { Name = "Laravel" }, new Tag { Name = "Symfony" }, new Tag { Name = "WordPress" },
                    new Tag { Name = "Ruby" }, new Tag { Name = "Ruby on Rails" }, new Tag { Name = "Sinatra" },
                    new Tag { Name = "Software" }, new Tag { Name = "Plugins" }, new Tag { Name = "Extensions" }, new Tag { Name = "Add-ons" },
                    new Tag { Name = "VS Code" }, new Tag { Name = "IDE" }, new Tag { Name = "Code Editor" },
                    new Tag { Name = "Web Development" }, new Tag { Name = "Frontend" }, new Tag { Name = "Backend" }, new Tag { Name = "Full Stack" },
                    new Tag { Name = "AWS" }, new Tag { Name = "Cloud" }, new Tag { Name = "Azure" }, new Tag { Name = "Google Cloud" },
                    new Tag { Name = "DevOps" }, new Tag { Name = "Docker" }, new Tag { Name = "Kubernetes" }, new Tag { Name = "CI/CD" },
                    
                    // Gaming
                    new Tag { Name = "Gaming" }, new Tag { Name = "Game Development" }, new Tag { Name = "Unity" }, new Tag { Name = "Unreal Engine" },
                    new Tag { Name = "Indie Games" }, new Tag { Name = "Mobile Games" }, new Tag { Name = "PC Games" },
                    new Tag { Name = "Streaming" }, new Tag { Name = "Twitch" }, new Tag { Name = "YouTube Gaming" }, new Tag { Name = "Live Streaming" },
                    
                    // Photography
                    new Tag { Name = "Photography" }, new Tag { Name = "Portrait Photography" }, new Tag { Name = "Landscape Photography" },
                    new Tag { Name = "Wedding Photography" }, new Tag { Name = "Event Photography" }, new Tag { Name = "Street Photography" },
                    new Tag { Name = "Cosplay" }, new Tag { Name = "Costume" }, new Tag { Name = "Convention" },
                    new Tag { Name = "Photo Courses" }, new Tag { Name = "Photography Tutorial" }, new Tag { Name = "Camera Techniques" },
                    new Tag { Name = "Photo Presets" }, new Tag { Name = "Lightroom Presets" }, new Tag { Name = "Photo Actions" },
                    new Tag { Name = "Reference Photos" }, new Tag { Name = "Photo Reference" }, new Tag { Name = "Art Reference" },
                    new Tag { Name = "Stock Photos" }, new Tag { Name = "Royalty Free" }, new Tag { Name = "Commercial Use" },
                    
                    // Comics & Graphic Novels
                    new Tag { Name = "Comics" }, new Tag { Name = "Graphic Novels" }, new Tag { Name = "Manga" }, new Tag { Name = "Webcomics" },
                    new Tag { Name = "Superhero" }, new Tag { Name = "Indie Comics" }, new Tag { Name = "Sequential Art" },
                    
                    // Fiction Books
                    new Tag { Name = "Fiction" }, new Tag { Name = "Books" }, new Tag { Name = "eBooks" }, new Tag { Name = "Novel" },
                    new Tag { Name = "Children's Books" }, new Tag { Name = "Kids" }, new Tag { Name = "Picture Books" },
                    new Tag { Name = "Fantasy" }, new Tag { Name = "Epic Fantasy" }, new Tag { Name = "Urban Fantasy" },
                    new Tag { Name = "Mystery" }, new Tag { Name = "Detective" }, new Tag { Name = "Crime" }, new Tag { Name = "Thriller" },
                    new Tag { Name = "Romance" }, new Tag { Name = "Historical Romance" }, new Tag { Name = "Contemporary Romance" },
                    new Tag { Name = "Science Fiction" }, new Tag { Name = "Sci-Fi" }, new Tag { Name = "Space Opera" },
                    new Tag { Name = "Young Adult" }, new Tag { Name = "YA" }, new Tag { Name = "Teen Fiction" },
                    
                    // Audio
                    new Tag { Name = "ASMR" }, new Tag { Name = "Relaxation" }, new Tag { Name = "Sleep Aid" }, new Tag { Name = "Tingles" },
                    new Tag { Name = "Healing" }, new Tag { Name = "Sound Therapy" }, new Tag { Name = "Wellness Audio" },
                    new Tag { Name = "Hypnosis" }, new Tag { Name = "Self-Hypnosis" }, new Tag { Name = "Therapeutic" },
                    new Tag { Name = "Sleep" }, new Tag { Name = "Meditation Audio" }, new Tag { Name = "Guided Meditation" },
                    new Tag { Name = "Subliminal" }, new Tag { Name = "Subliminal Messages" }, new Tag { Name = "Affirmations" },
                    new Tag { Name = "Voiceover" }, new Tag { Name = "Voice Acting" }, new Tag { Name = "Narration" },
                    
                    // Recorded Music
                    new Tag { Name = "Recorded Music" }, new Tag { Name = "Albums" }, new Tag { Name = "EP" }, new Tag { Name = "LP" },
                    new Tag { Name = "Singles" }, new Tag { Name = "Hit Songs" }, new Tag { Name = "Chart Music" },
                    new Tag { Name = "Children Music" }, new Tag { Name = "Kids Songs" }, new Tag { Name = "Nursery Rhymes" },
                    new Tag { Name = "Christian Music" }, new Tag { Name = "Gospel" }, new Tag { Name = "Worship" },
                    new Tag { Name = "Classic Rock" }, new Tag { Name = "Rock Music" }, new Tag { Name = "Hard Rock" },
                    new Tag { Name = "Classical Music" }, new Tag { Name = "Orchestra" }, new Tag { Name = "Symphony" },
                    new Tag { Name = "Country Music" }, new Tag { Name = "Country" }, new Tag { Name = "Folk Country" },
                    new Tag { Name = "Electronic Music" }, new Tag { Name = "EDM" }, new Tag { Name = "Techno" }, new Tag { Name = "House" },
                    new Tag { Name = "Folk Music" }, new Tag { Name = "Acoustic" }, new Tag { Name = "Traditional" },
                    new Tag { Name = "Heavy Metal" }, new Tag { Name = "Death Metal" }, new Tag { Name = "Black Metal" },
                    new Tag { Name = "Holiday Music" }, new Tag { Name = "Christmas" }, new Tag { Name = "Seasonal" },
                    new Tag { Name = "Jazz Music" }, new Tag { Name = "Smooth Jazz" }, new Tag { Name = "Bebop" },
                    new Tag { Name = "Latin Music" }, new Tag { Name = "Salsa" }, new Tag { Name = "Reggaeton" },
                    new Tag { Name = "New Age Music" }, new Tag { Name = "Ambient Music" }, new Tag { Name = "Chill" },
                    new Tag { Name = "Opera" }, new Tag { Name = "Classical Vocal" }, new Tag { Name = "Art Songs" },
                    new Tag { Name = "Pop Music" }, new Tag { Name = "Top 40" }, new Tag { Name = "Mainstream" },
                    new Tag { Name = "Hip-Hop" }, new Tag { Name = "Rap" }, new Tag { Name = "Trap" }, new Tag { Name = "Old School" },
                    new Tag { Name = "R&B" }, new Tag { Name = "Soul" }, new Tag { Name = "Funk" },
                    new Tag { Name = "Soundtracks" }, new Tag { Name = "Film Music" }, new Tag { Name = "Game Music" },
                    new Tag { Name = "World Music" }, new Tag { Name = "Ethnic" }, new Tag { Name = "Cultural" },
                    
                    // Technology & Tools
                    new Tag { Name = "Technology" }, new Tag { Name = "Software" }, new Tag { Name = "Tools" }, new Tag { Name = "Automation" },
                    new Tag { Name = "Productivity Tools" }, new Tag { Name = "Browser Extension" }, new Tag { Name = "Desktop App" },
                    new Tag { Name = "SaaS" }, new Tag { Name = "API" }, new Tag { Name = "Integration" },
                    
                    // Content Types
                    new Tag { Name = "Tutorial" }, new Tag { Name = "Course" }, new Tag { Name = "Guide" }, new Tag { Name = "Template" },
                    new Tag { Name = "Preset" }, new Tag { Name = "Bundle" }, new Tag { Name = "Pack" }, new Tag { Name = "Collection" },
                    new Tag { Name = "Premium" }, new Tag { Name = "Professional" }, new Tag { Name = "Advanced" }, new Tag { Name = "Beginner" },
                    new Tag { Name = "Instant Download" }, new Tag { Name = "Digital Download" }, new Tag { Name = "Commercial License" },
                    
                    // Additional Popular Tags
                    new Tag { Name = "Creative" }, new Tag { Name = "Professional" }, new Tag { Name = "Quality" }, new Tag { Name = "Exclusive" },
                    new Tag { Name = "Trending" }, new Tag { Name = "Popular" }, new Tag { Name = "Bestseller" }, new Tag { Name = "New Release" },
                    new Tag { Name = "Limited Edition" }, new Tag { Name = "Seasonal" }, new Tag { Name = "Vintage" }, new Tag { Name = "Modern" },
                    new Tag { Name = "Minimalist" }, new Tag { Name = "Elegant" }, new Tag { Name = "Bold" }, new Tag { Name = "Colorful" }
                };
                
                context.Tags.AddRange(comprehensiveTags);
                context.SaveChanges();
            }

            // --- Products ---
            if (!context.Products.Any())
            {
                var creators = context.Users.Where(u => u.Role == "Creator").ToList();
                var categories = context.Categories.ToList();
                var tags = context.Tags.ToList();
                
                var faker = new Faker("en_US");
                
                // Define product templates for realistic digital products
                var productTemplates = new[]
                {
                    // eBooks
                    new { Names = new[] { "The Complete Guide to {0}", "Mastering {0} in 30 Days", "{0} for Beginners", "Advanced {0} Strategies", "The Ultimate {0} Handbook" }, 
                          Descriptions = new[] { "Transform your skills with this comprehensive guide to {0}.", "Learn practical {0} techniques that actually work.", "Everything you need to know about {0} in one place.", "Step-by-step strategies for mastering {0}.", "The definitive resource for {0} success." },
                          CategoryTypes = new[] { "Self Improvement", "Business & Money", "Education", "Fiction Books" },
                          PriceRange = new { Min = 9.99m, Max = 49.99m } },
                    
                    // Online Courses
                    new { Names = new[] { "Complete {0} Bootcamp", "Zero to Hero: {0} Course", "Professional {0} Training", "{0} Masterclass", "Learn {0} Fast" },
                          Descriptions = new[] { "Master {0} with hands-on projects and real-world examples.", "From beginner to professional {0} developer.", "Industry-standard {0} training with lifetime access.", "Learn {0} the right way with expert instruction.", "Fast-track your {0} skills with this intensive course." },
                          CategoryTypes = new[] { "Software Development", "Design", "Business & Money", "Education" },
                          PriceRange = new { Min = 29.99m, Max = 199.99m } },
                    
                    // Music & Audio
                    new { Names = new[] { "{0} Sample Pack", "Premium {0} Beats", "{0} Production Kit", "Professional {0} Loops", "{0} Sound Library" },
                          Descriptions = new[] { "High-quality {0} samples for your next hit.", "Professionally produced {0} beats ready to use.", "Complete {0} production toolkit with stems.", "Royalty-free {0} loops for commercial use.", "Exclusive {0} sounds you won't find anywhere else." },
                          CategoryTypes = new[] { "Recorded Music", "Music & Sound Design" },
                          PriceRange = new { Min = 4.99m, Max = 79.99m } },
                    
                    // Software Tools
                    new { Names = new[] { "{0} Pro Tool", "Smart {0} Assistant", "{0} Automation Suite", "Advanced {0} Manager", "{0} Productivity App" },
                          Descriptions = new[] { "Streamline your {0} workflow with this powerful tool.", "Automate repetitive {0} tasks and save hours.", "Professional-grade {0} software for serious users.", "Boost your {0} productivity with smart automation.", "The ultimate {0} tool for power users." },
                          CategoryTypes = new[] { "Software Development", "Gaming", "Productivity" },
                          PriceRange = new { Min = 19.99m, Max = 149.99m } },
                    
                    // Digital Art & Design
                    new { Names = new[] { "{0} Design Pack", "Premium {0} Templates", "{0} Asset Collection", "Professional {0} Kit", "{0} Creative Bundle" },
                          Descriptions = new[] { "Stunning {0} designs ready for commercial use.", "High-quality {0} templates that save you time.", "Complete {0} asset pack for your projects.", "Professional {0} resources for designers.", "Everything you need for amazing {0} designs." },
                          CategoryTypes = new[] { "Design", "Drawing & Painting", "Photography" },
                          PriceRange = new { Min = 14.99m, Max = 89.99m } }
                };
                
                var subjects = new[] { "Web Development", "Digital Marketing", "Graphic Design", "Photography", "Music Production", 
                                     "Python Programming", "JavaScript", "React", "E-commerce", "Social Media", "SEO", "Content Creation",
                                     "Personal Finance", "Entrepreneurship", "Productivity", "Mindfulness", "Fitness", "Nutrition",
                                     "Creative Writing", "Video Editing", "Animation", "UI/UX Design", "Data Science", "Machine Learning",
                                     "Copywriting", "Email Marketing", "Affiliate Marketing", "Dropshipping", "Real Estate", "Investing" };
                
                var products = new List<Product>();
                
                for (int i = 0; i < 1600; i++)
                {
                    var template = faker.PickRandom(productTemplates);
                    var subject = faker.PickRandom(subjects);
                    var creator = faker.PickRandom(creators);
                    
                    // Match category more precisely based on template
                    var relevantCategories = categories.Where(c => template.CategoryTypes.Contains(c.Name)).ToList();
                    var category = relevantCategories.Any() ? faker.PickRandom(relevantCategories) : faker.PickRandom(categories);
                    
                    var productName = string.Format(faker.PickRandom(template.Names), subject);
                    var description = string.Format(faker.PickRandom(template.Descriptions), subject);
                    var price = Math.Round(faker.Random.Decimal(template.PriceRange.Min, template.PriceRange.Max), 2);
                    
                    var baseSlug = productName.ToLowerInvariant()
                        .Replace(" ", "-")
                        .Replace(":", "")
                        .Replace(".", "")
                        .Replace(",", "")
                        .Replace("'", "")
                        .Replace("\"", "");
                    var uniqueSlug = $"{baseSlug}-{faker.Random.AlphaNumeric(6)}";
                    
                    var product = new Product
                    {
                        Name = productName,
                        Description = description,
                        Price = price,
                        Currency = "USD",
                        CreatorId = creator.Id,
                        CategoryId = category.Id,
                        IsPublic = true,
                        Status = "published",
                        PublishedAt = faker.Date.Past(2),
                        Permalink = uniqueSlug,
                        CoverImageUrl = faker.Image.PicsumUrl(800, 600),
                        ThumbnailImageUrl = faker.Image.PicsumUrl(300, 300),
                        Features = $"[\"{faker.Lorem.Words(3).Aggregate((a, b) => a + " " + b)}\", \"{faker.Lorem.Words(3).Aggregate((a, b) => a + " " + b)}\"]",
                        License = faker.PickRandom(new[] { "Standard License", "Commercial License", "Extended License" }),
                        ProductTags = new List<ProductTag>()
                    };
                    
                    // Add 3-5 relevant tags per product based on category
                    var categoryRelatedTags = tags.Where(t => 
                        t.Name.ToLower().Contains(category.Name.ToLower().Split(' ')[0]) ||
                        category.Name.ToLower().Contains(t.Name.ToLower()) ||
                        (category.ParentCategoryId.HasValue && 
                         categories.FirstOrDefault(c => c.Id == category.ParentCategoryId)?.Name.ToLower().Contains(t.Name.ToLower()) == true)
                    ).ToList();
                    
                    var selectedTags = categoryRelatedTags.Any() 
                        ? categoryRelatedTags.OrderBy(x => faker.Random.Number()).Take(faker.Random.Number(2, 3)).ToList()
                        : new List<Tag>();
                    
                    // Add some general relevant tags
                    var generalTags = tags.Where(t => !categoryRelatedTags.Contains(t))
                        .OrderBy(x => faker.Random.Number())
                        .Take(faker.Random.Number(1, 2))
                        .ToList();
                    
                    selectedTags.AddRange(generalTags);
                    selectedTags = selectedTags.Take(5).ToList(); // Max 5 tags
                    
                    foreach (var tag in selectedTags)
                    {
                        product.ProductTags.Add(new ProductTag { TagId = tag.Id });
                    }
                    
                    products.Add(product);
                }
                
                context.Products.AddRange(products);
                context.SaveChanges();
            }

            // --- Files ---
            if (!context.Files.Any())
            {
                var products = context.Products.ToList();
                var faker = new Faker("en_US");
                var files = new List<AddedFile>();

                foreach (var product in products)
                {
                    // Each product gets 1-3 files
                    var numberOfFiles = faker.Random.Number(1, 3);
                    for (int i = 0; i < numberOfFiles; i++)
                    {
                        var fileExtensions = new[] { ".pdf", ".zip", ".mp3", ".mp4", ".psd", ".ai", ".docx", ".xlsx", ".png", ".jpg" };
                        var extension = faker.PickRandom(fileExtensions);
                        var fileName = $"{faker.System.FileName().Replace(".", "")}{extension}";
                        
                        var file = new AddedFile
                        {
                            ProductId = product.Id,
                            Name = fileName,
                            FileUrl = $"/uploads/products/{product.Id}/{fileName}",
                            Size = faker.Random.Number(100000, 50000000), // 100KB to 50MB
                            ContentType = GetContentType(extension)
                        };
                        
                        files.Add(file);
                    }
                }

                context.Files.AddRange(files);
                context.SaveChanges();
            }

            // --- Variants ---
            if (!context.Variants.Any())
            {
                var products = context.Products.ToList();
                var faker = new Faker("en_US");
                var variants = new List<Variant>();

                // Only some products have variants (30% chance)
                foreach (var product in products.Where(p => faker.Random.Bool(0.3f)))
                {
                    var variantNames = new[] { "Premium", "Deluxe", "Pro", "Extended", "Commercial", "Basic", "Standard" };
                    var variantName = faker.PickRandom(variantNames) + " Edition";
                    
                    var variant = new Variant
                    {
                        ProductId = product.Id,
                        Name = variantName,
                        PriceAdjustment = faker.Random.Decimal(-10, 50) // Can be discount or premium
                    };
                    
                    variants.Add(variant);
                }

                context.Variants.AddRange(variants);
                context.SaveChanges();
            }

            // --- Orders (Required for Reviews) ---
            if (!context.Orders.Any())
            {
                var customerIds = context.Users.Where(u => u.Role == "Customer").Select(u => u.Id).ToList();
                var productIds = context.Products.Select(p => p.Id).ToList();
                var products = context.Products.ToList();
                var faker = new Faker("en_US");
                var orders = new List<Order>();

                // Create orders for customers (each customer makes 3-8 orders)
                foreach (var customerId in customerIds)
                {
                    var numberOfOrders = faker.Random.Number(3, 8);
                    for (int i = 0; i < numberOfOrders; i++)
                    {
                        var orderDate = faker.Date.Past(1, DateTime.UtcNow.AddDays(-7)); // At least a week old
                        var numberOfItems = faker.Random.Number(1, 4);
                        var selectedProducts = faker.PickRandom(products, numberOfItems).ToList();
                        
                        var orderItems = selectedProducts.Select(product => new OrderItem
                        {
                            ProductId = product.Id,
                            Quantity = 1, // Digital products typically quantity 1
                            UnitPrice = product.Price,
                            ProductNameSnapshot = product.Name,
                            CurrencySnapshot = product.Currency,
                            CreatedAt = orderDate
                        }).ToList();

                        var order = new Order
                        {
                            BuyerId = customerId,
                            OrderedAt = orderDate,
                            Status = "Completed", // Only completed orders can be reviewed
                            TotalAmount = orderItems.Sum(item => item.TotalPrice),
                            OrderItems = orderItems
                        };

                        orders.Add(order);
                    }
                }

                context.Orders.AddRange(orders);
                context.SaveChanges();
            }

            // --- Wishlist ---
            if (!context.WishlistItems.Any())
            {
                var customerIds = context.Users.Where(u => u.Role == "Customer").Select(u => u.Id).ToList();
                var productIds = context.Products.Select(p => p.Id).ToList();
                var faker = new Faker("en_US");
                var wishlistSet = new HashSet<(int, int)>();
                var wishlistEntries = new List<WishlistItem>();
                int target = customerIds.Count * 8; // More wishlist items
                while (wishlistEntries.Count < target) {
                    var userId = faker.PickRandom(customerIds);
                    var productId = faker.PickRandom(productIds);
                    if (wishlistSet.Add((userId, productId))) {
                        wishlistEntries.Add(new WishlistItem {
                            UserId = userId,
                            ProductId = productId,
                            AddedAt = faker.Date.Recent(90)
                        });
                    }
                }
                context.WishlistItems.AddRange(wishlistEntries);
                context.SaveChanges();
            }

            // --- Reviews (3000 reviews from customers who bought products) ---
            if (!context.Reviews.Any())
            {
                var completedOrders = context.Orders
                    .Where(o => o.Status == "Completed")
                    .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                    .Include(o => o.Buyer)
                    .ToList();

                var faker = new Faker("en_US");
                var reviews = new List<Review>();
                var reviewSet = new HashSet<(int, int)>(); // (UserId, ProductId) to avoid duplicates

                // Create realistic English reviews
                var positiveReviews = new[]
                {
                    "Excellent quality! Exactly what I was looking for. Highly recommended!",
                    "Outstanding product! The creator really knows their stuff. Worth every penny.",
                    "This exceeded my expectations. Great attention to detail and very professional.",
                    "Perfect for my needs. The instructions were clear and easy to follow.",
                    "Amazing work! This has helped me tremendously in my projects.",
                    "Top-notch quality. I'll definitely be purchasing more from this creator.",
                    "Fantastic resource! Saved me hours of work. Thank you!",
                    "Really well done. The quality is impressive and delivery was instant.",
                    "This is exactly what I needed. Great value for money!",
                    "Superb! The creator went above and beyond. Highly satisfied.",
                    "Love this! Very detailed and professionally made.",
                    "Incredible quality! This will be perfect for my project."
                };

                var neutralReviews = new[]
                {
                    "Good product overall. Does what it promises.",
                    "Decent quality. Nothing spectacular but gets the job done.",
                    "It's okay. Met my basic requirements.",
                    "Average product. Could use some improvements but functional.",
                    "Fair value. The content is adequate for the price.",
                    "Not bad. Has potential but could be better organized.",
                    "Acceptable quality. Works as described."
                };

                var negativeReviews = new[]
                {
                    "Not quite what I expected. The description could be more accurate.",
                    "Okay product but I've seen better for the same price.",
                    "Could use some improvements. The quality isn't consistent.",
                    "It's fine but doesn't stand out from similar products.",
                    "Expected more based on the preview. Somewhat disappointed."
                };

                // Generate reviews for purchased products
                foreach (var order in completedOrders.Take(800)) // Limit to avoid too many reviews per order
                {
                    foreach (var orderItem in order.OrderItems)
                    {
                        // 70% chance of leaving a review
                        if (faker.Random.Bool(0.7f) && reviewSet.Add((order.BuyerId, orderItem.ProductId)))
                        {
                            string comment;
                            int rating;

                            // Weight ratings towards positive (realistic marketplace behavior)
                            var ratingWeight = faker.Random.Float();
                            if (ratingWeight < 0.6) // 60% - 4-5 stars
                            {
                                rating = faker.Random.Number(4, 5);
                                comment = faker.PickRandom(positiveReviews);
                            }
                            else if (ratingWeight < 0.85) // 25% - 3 stars
                            {
                                rating = 3;
                                comment = faker.PickRandom(neutralReviews);
                            }
                            else // 15% - 1-2 stars
                            {
                                rating = faker.Random.Number(1, 2);
                                comment = faker.PickRandom(negativeReviews);
                            }

                            var review = new Review
                            {
                                UserId = order.BuyerId,
                                ProductId = orderItem.ProductId,
                                Rating = rating,
                                Comment = comment,
                                CreatedAt = faker.Date.Between(order.OrderedAt.AddDays(1), DateTime.UtcNow),
                                IsApproved = faker.Random.Bool(0.95f) // 95% approved
                            };

                            reviews.Add(review);

                            if (reviews.Count >= 3000) break;
                        }
                    }
                    if (reviews.Count >= 3000) break;
                }

                context.Reviews.AddRange(reviews);
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